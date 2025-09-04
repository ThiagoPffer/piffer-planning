import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, QueryList, ViewChildren, ViewContainerRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { get, getDatabase, onValue, ref, set, update } from 'firebase/database';
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { environment } from '../../../environments/environment';
import { InfoPanelComponent } from "../../components/info-panel/info-panel.component";
import { EmojiComponent } from "../../components/voter-card/emoji/emoji.component";
import { VoterCardComponent, VoterPokeEvent } from "../../components/voter-card/voter-card.component";
import { ToastService } from '../../core/toast.service';


@Component({
  selector: 'app-planning-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    InfoPanelComponent,
    VoterCardComponent
],
  templateUrl: './planning-table.component.html',
  styleUrl: './planning-table.component.css'
})
export class PlanningTableComponent implements OnInit, OnDestroy {

  public app = initializeApp(environment.firebaseConfig as FirebaseOptions);
  public database = getDatabase(this.app);
  public firestore = getFirestore(this.app);

  public planningId!: string;
  public planningName!: string;
  public showNameDialog: boolean = false;
  public showConfigDialog: boolean = false;
  public userName!: string;
  public isObserver: boolean = false;
  public user!: Voter;
  public votedOption: string | null = null;
  public users: User[] = [];
  public voters: Voter[] = [];
  public observers: User[] = [];
  public pokeList: {id: string, position: number}[] = [];
  public currentIssue!: Issue | null;
  public options: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "☕"];
  public pokeControl: { [key: string]: { count: string, unsubscribe: any } } = {};
  private votersUnsubscribe: any = null;
  private issueUnsubscribe: any = null;
  @ViewChildren('voterCardList') voterCardList!: QueryList<VoterCardComponent>;

  constructor(
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.planningId = this.router.url.split('/')[1];
    this.loadPlanningData();
    this.loadUserData();
    this.setVotersListener();
    this.setCurrentIssueListener();
  }

  loadPlanningData() {
    get(ref(this.database, `plannings/${this.planningId}/name`)).then(snapshot => {
      if (snapshot.exists()) {
        this.planningName = snapshot.val() as string;
      }
    });
  }

  setVotersListener() {
    this.votersUnsubscribe = onValue(ref(this.database, `plannings/${this.planningId}/voters/`), snapshot => {
      const users = Object.values(snapshot.val()) as User[];
      this.user = users.find(u => u.uid === this.user?.uid) as Voter;
      this.users = users;

      if (users.some(u => u.uid === this.user?.uid) === false) {
        this.leavePlanning();
        return;
      }

      this.voters = users.filter((u: any) => u.online && !u.observer) as Voter[];
      this.observers = users.filter((u: any) => u.online && u.observer) as User[];

      if (this.voters.every(v => v.votedOption) && !this.currentIssue?.averageVoting) {
        this.finishVoting();
      }

      this.voters.forEach(v => {
        if (v.online) {
          this.setPokesListener(v);
        }
        if (!v.online && this.pokeControl[v.uid]?.unsubscribe) {
          this.pokeControl[v.uid]?.unsubscribe();
        }
      });
    });
  }

  setPokesListener(voter: Voter) {
    if (!this.pokeControl[voter.uid]) {
      this.pokeControl[voter.uid] = {} as { count: string, unsubscribe: any };
      this.pokeControl[voter.uid].unsubscribe = onValue(ref(this.database, `plannings/${this.planningId}/pokes/${voter.uid}`), snapshot => {
        const poke = snapshot.val() as any;
  
        if (this.pokeControl[voter.uid].count !== poke?.count) {
          this.poked(voter.uid, poke);
        }
  
        this.pokeControl[voter.uid].count = poke?.count || '0';
      });
    }
  }

  setCurrentIssueListener() {
    this.issueUnsubscribe = onValue(ref(this.database, `plannings/${this.planningId}/issue`), async snapshot => {
      const issueId = snapshot.val() as string;
      this.currentIssue = issueId ? (await getDoc(doc(this.firestore, 'issues', issueId))).data() as Issue : null;
      if (this.currentIssue?.description) {
        this.votedOption = null;
        this.toastService.showMessage('Votando: ' + this.currentIssue?.description);
      }
    })
  }

  ngOnDestroy(): void {
    if (this.user?.uid) {
      update(ref(this.database, `plannings/${this.planningId}/voters/${this.user.uid}`), { online: false });
    }
  }

  private finishVoting() {
    if (this.currentIssue) {
      this.votedOption = null;
      const votes = this.voters.map(v => {
        if (v.votedOption && !Number.isNaN(Number(v.votedOption))) {
          return Number(v.votedOption);
        }
        return 0;
      });
      const avgVoting = this.calculateAverage(votes);
      updateDoc(doc(this.firestore, 'issues', this.currentIssue.id as string), { status : EnumIssueStatus.FINALIZADO, averageVoting: avgVoting });
    }
  }

  public loadUserData() {
    var userData = JSON.parse(localStorage.getItem('userData') as string) as Voter;
    if (!userData) {
      this.showNameDialog = true;
      return;
    }
    this.user = userData;
    update(ref(this.database, `plannings/${this.planningId}/voters/${this.user.uid}`), {...userData, online: true});
  }

  public onIssuesLoaded(issues: Issue[]) {
    this.currentIssue = issues.find(i => i.id === this.currentIssue?.id) || null;
  }

  public saveUser() {
    if (this.userName) {
      this.user = { name: this.userName, uid: crypto.randomUUID(), observer: this.isObserver };
      set(ref(this.database, `plannings/${this.planningId}/voters/${this.user.uid}`), {...this.user, online: true});
      localStorage.setItem('userData', JSON.stringify(this.user));
      this.showNameDialog = false;
    }
  }

  public onVote(option: string | null) {
    if (this.votedOption === option) {
      option = null;
    }

    this.votedOption = option;
    set(ref(this.database, `plannings/${this.planningId}/voters/` + this.user.uid + '/votedOption'), option);
  }

  public onReset(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(null);
    updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTAR, averageVoting: null });
  }

  public resetVotes(issue: string | null) {
    update(ref(this.database, `plannings/${this.planningId}/`), {
      issue,
      voters: this.voters.reduce((v: any, voter: Voter) => {
        voter.votedOption = null;
        v[voter.uid] = voter;
        return v;
      }, {
        ...this.observers.reduce((o: any, observer: User) => {
          o[observer.uid] = observer
          return o;
        }, {})
      })
    });
  }

  public onStartVoting(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(issue.id);
    updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTANDO });
  }

  private calculateAverage(numbers: number[]) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round(sum / numbers.filter(n => n !== 0).length);
  }

  public onPoke(event: VoterPokeEvent) {
    const { voter, emoji } = event;
    if (voter.uid !== this.user.uid) {
      set(ref(this.database, `plannings/${this.planningId}/pokes/${voter.uid}/`), {
        count: Math.random().toFixed(5), emoji
      });
    }
  }

  public poked(voterId: string, poke: any) {
    const voterCard = this.voterCardList?.toArray().find(c => c.voter.uid === voterId);
    const voterCardPosition = voterCard?.cardElement.nativeElement.getBoundingClientRect();
    if (voterCardPosition) {
      const component = this.viewContainerRef.createComponent(EmojiComponent);
      component.setInput('initialTop', 0);
      component.setInput('initialLeft', ((Number(poke.count)*100000) % 2 === 0 ? 0 : window.screen.width));
      component.setInput('hitTop', voterCardPosition.top-30);
      component.setInput('hitLeft', voterCardPosition.left+25);
      component.setInput('finalLeft', voterCardPosition.left+Math.round(Math.random()*100));
      component.setInput('emoji', poke.emoji);
      setTimeout(() => component.destroy(), 2400);
    }
  }

  public copyPlanningId() {
    navigator.clipboard.writeText(this.planningId).then(() => {
      this.toastService.showMessage('ID da planning copiado');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  public toggleObserver() {
    this.user.observer = !this.user.observer;
    update(ref(this.database, `plannings/${this.planningId}/voters/${this.user.uid}`), { observer: this.user.observer });
    this.isObserver = this.user.observer;
    localStorage.setItem('userData', JSON.stringify(this.user));
  }

  public toggleConfigurations() {
    this.showConfigDialog = !this.showConfigDialog;
  }

  public kickOutUser(user: User) {
    if (user.uid !== this.user.uid) {
      set(ref(this.database, `plannings/${this.planningId}/voters/${user.uid}`), null);
      this.toastService.showMessage(`${user.name} foi desconectado.`);
    }
  }

  public onLeavePlanning() {
    confirm('Tem certeza que deseja sair da planning?') && this.leavePlanning();
  }

  private leavePlanning() {
    this.cleanupListenersAndData();
    this.router.navigateByUrl('/');
  }

  public cleanupListenersAndData() {
    if (this.votersUnsubscribe) {
      this.votersUnsubscribe();
      this.votersUnsubscribe = null;
    }
    if (this.issueUnsubscribe) {
      this.issueUnsubscribe();
      this.issueUnsubscribe = null;
    }

    Object.values(this.pokeControl).forEach(ctrl => {
      if (ctrl.unsubscribe) {
        ctrl.unsubscribe();
      }
    });

    this.pokeControl = {};
    this.users = [];
    this.voters = [];
    this.observers = [];
    this.pokeList = [];
    this.currentIssue = null;
    this.votedOption = null;
  }

}

export interface User {
  uid: string
  name: string
  online?: boolean
  observer?: boolean
  admin?: boolean
}

export interface Voter extends User {
  votedOption?: string | null
  pokedBy?: any
}

export interface Planning {
  id?: string
  name: string
  issue: string
  voters: User[]
}

export interface Issue {
  id: string
  description: string
  averageVoting?: number
  planningId: string
  status: EnumIssueStatus
  url: string
}

export enum EnumIssueStatus {
  VOTANDO = 'Votando', 
  VOTAR = 'Votar',
  FINALIZADO = 'Finalizado',
}
