import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref, set, update } from 'firebase/database';
import { addDoc, collection, doc, getDoc, getFirestore, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { environment } from '../../../environments/environment';
import { InfoPanelComponent } from "../../components/info-panel/info-panel.component";
import { VoterCardComponent } from "../../components/voter-card/voter-card.component";


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

  public app = initializeApp(environment.firebaseConfig);
  public database = getDatabase(this.app);
  public firestore = getFirestore(this.app);
  public dbRef = ref(this.database, 'plannings/teste-chave-aleatoria/');

  public planningName!: string;
  public showNameDialog: boolean = false;
  public userName!: string;
  public user!: Voter;
  public votedOption: string | null = null;
  public voters: Voter[] = [];
  public currentIssue!: Issue | null;
  public options: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "☕"];

  constructor() {}

  ngOnInit(): void {
    this.loadUserData();
    onValue(this.dbRef, async (snapshot) => {
      const data = snapshot.val() as Planning;
      this.planningName = data.name;
      this.voters = Object.values(data.voters).filter(v => v.online);
      this.votedOption = this.voters.find(v => v.uid === this.user.uid)?.votedOption || null;
      this.currentIssue = data.issue ? (await getDoc(doc(this.firestore, 'issues', data.issue))).data() as Issue : null;

      if (this.voters.every(v => v.votedOption) && !this.currentIssue?.averageVoting) {
        this.finishVoting();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.user?.uid) {
      update(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid), { online: false });
    }
  }

  private finishVoting() {
    this.votedOption = null;
    const votes = this.voters.map(v => {
      if (v.votedOption && !Number.isNaN(Number(v.votedOption))) {
        return Number(v.votedOption);
      }
      return 0;
    });
    const avgVoting = this.calculateAverage(votes);
    updateDoc(doc(this.firestore, 'issues', this.currentIssue?.id as string), { status : EnumIssueStatus.FINALIZADO, averageVoting: avgVoting });
  }

  public loadUserData() {
    var userData = JSON.parse(localStorage.getItem('userData') as string) as Voter;
    if (!userData) {
      this.showNameDialog = true;
      return;
    }
    this.user = userData;
    update(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid), {...userData, online: true});
  }

  public onIssuesLoaded(issues: Issue[]) {
      this.currentIssue = issues.find(i => i.id === this.currentIssue?.id) || null;
  }

  public saveUser() {
    if (this.userName) {
      this.user = { name: this.userName, uid: crypto.randomUUID() };
      set(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid), {...this.user, online: true});
      localStorage.setItem('userData', JSON.stringify(this.user));
      this.showNameDialog = false;
    }
  }

  public onVote(option: string) {
    this.votedOption = option;
    set(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid + '/votedOption'), option);
  }

  public onReset(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(null);
    updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTAR, averageVoting: null });
  }

  public resetVotes(issue: string | null) {
    update(ref(this.database, 'plannings/teste-chave-aleatoria/'), {
      issue,
      voters: this.voters.reduce((v: any, voter: any) => {
        voter.votedOption = null;
        v[voter.uid] = voter;
        return v;
      }, {})
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
}

export interface Voter {
  uid: string
  name: string
  votedOption?: string
  online?: boolean
}

export interface Planning {
  id?: string
  name: string
  issue: string
  voters: Voter[]
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