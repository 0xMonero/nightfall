import { Component, OnInit, ViewChild, AfterContentInit} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import FtCommitmentService from '../../services/ft-commitment.service';
import UserService from '../../services/user.service';
import { UtilService } from '../../services/utils/util.service';
import { NgSelectComponent } from '@ng-select/ng-select';

/**
 *  ft-commitment trasfer component, which is used for rendering the page of transfer ERC-20 token commitments to the selected receipent.
 */
@Component({
  selector: 'app-ft-commitment-transfer',
  templateUrl: './index.html',
  providers: [FtCommitmentService, UserService, UtilService],
  styleUrls: ['./index.css']
})

export default class FtCommitmentTrasnferComponent implements OnInit , AfterContentInit {

  /**
   *  To store ERC-20 token commitment transaction objects
   */
  transactions: Array<Object>;

  /**
   * To store the selected ERC-20 token commitments
   */
  selectedCommitmentList: any = [];

  /**
   * Flag for http request
   */
  isRequesting = false;

  /**
   * Amount to transfer
   */
  transferValue: number;

  /**
   * To store all users
   */
  users: any;

  /**
   * Name of the receiver
   */
  receiverName: string;

  /**
   *  Fungeble Token name , read from ERC-20 contract.
   */
  ftName: string;

  /**
   *  Fungeble Token Symbol , read from ERC-20 contract.
   */
  ftSymbol: string;

  /**
   * Reference of combo box
   */
  @ViewChild('select') select: NgSelectComponent;

  constructor(
    private toastr: ToastrService,
    private ftCommitmentService: FtCommitmentService,
    private userService: UserService,
    private utilService: UtilService,
    private router: Router
  ) {

    this.customSearchFn = this.customSearchFn.bind(this);
  }

  ngOnInit () {
    this.ftName = localStorage.getItem('ftName');
    this.ftSymbol = localStorage.getItem('ftSymbol');
    this.getAllRegisteredNames();
    this.getFTCommitments();
  }

  ngAfterContentInit() {
    setTimeout(() => {
      this.select.filterInput.nativeElement.focus();
    }, 500);
  }

  /**
   * Method list down all ERC-20 commitments.
   */
  getFTCommitments() {
    this.isRequesting = true;
    this.ftCommitmentService.getFTCommitments()
      .subscribe(
        (data) => {
        this.isRequesting = false;
        if (data && data['data'].length ) {
          this.transactions = data['data'].map((tx, indx) => {
            tx.selected = false;
            tx.id = indx;
            return tx;
          });
        }
      }, (error) => {
        console.log('Error in listing FTCommitments', error);
        this.isRequesting = false;
      });
  }

  /**
   * Method to retrive all users.
   *
   */
  getAllRegisteredNames() {
    this.isRequesting = true;
    this.userService.getAllRegisteredNames().subscribe(
      data => {
        this.isRequesting = false;
        this.users = data['data'];
      }, error => {
        this.isRequesting = false;
        this.toastr.error('Please try again.', 'Error');
      });
  }

  /**
   * Method to transfer two ERC-20 token commitement to selected user.
   */
  initiateTransfer () {
    const count = this.selectedCommitmentList.length;
    if (!count || count !== 2) {
      this.toastr.warning('Invalid commitment Selection.', 'Warning');
      return;
    }
    const [commitment1, commitment2] = this.selectedCommitmentList;
    const {
      transferValue,
      transactions
    } = this;

    if (!transferValue || !this.receiverName) {
      this.toastr.warning('All fields are mandatory.', 'Warning');
      return;
    }

    this.isRequesting = true;
    let returnValue = Number(commitment1['value']) + Number(commitment2['value']);
    returnValue -= transferValue;
    console.log('RETURNVALUE', returnValue, transferValue, this.toHex(returnValue), this.toHex(transferValue));
    this.ftCommitmentService.transferFTCommitment(
      [commitment1, commitment2],
      [{value: this.toHex(transferValue)}, {value: this.toHex(returnValue)}],
      this.receiverName
    ).subscribe( data => {
        this.isRequesting = false;
        this.toastr.info(`Transferring to ${this.receiverName}.`);

        // delete used commitments from commitment list
        transactions.splice(transactions.indexOf(commitment1), 1);
        transactions.splice(transactions.indexOf(commitment2), 1);
        this.transactions = [ ...this.transactions ];

        // reset the form
        this.selectedCommitmentList = [];
        this.transferValue = null;
        this.receiverName = null;

        // navigate to overview page if no more commitment left
        if (!transactions.length) {
          this.router.navigate(['/overview'], { queryParams: { selectedTab: 'ft-commitment' } });
        }
      }, error => {
        this.isRequesting = false;
        this.toastr.error('Please try again.', 'Error');
    });
  }

  /**
   * Method remove selected commitment.
   * @param item {Object} Item to be removed.
   */
  onRemove(item) {
    const newList = this.selectedCommitmentList.filter((it) => {
      return item._id !== it._id;
    });
    this.selectedCommitmentList = newList;
  }

  /**
   * Method to serach an item from the combobox.
   *
   * @param term {String} Term that user entered
   * @param item {Item} Item which searched by user.
   */
  customSearchFn(term: string, item: any) {
    if (!item) {
      return;
    }
    term = term.toLocaleLowerCase();
    const itemToSearch = this.utilService.convertToNumber(item.value).toString().toLocaleLowerCase();
    return itemToSearch.indexOf(term) > -1;
  }

  /**
   * Method to convert number to hex string
   *
   * @param num {Number} Number
   */
  toHex(num: number) {
    if (!num || isNaN(num)) {
      num = 0;
    }
    const hexValue = (num).toString(16);
    return '0x' + hexValue.padStart(32, '0');
  }

}


