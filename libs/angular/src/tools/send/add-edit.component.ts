import { DatePipe } from "@angular/common";
import { Directive, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";

import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { EncArrayBuffer } from "@bitwarden/common/platform/models/domain/enc-array-buffer";
import { SendType } from "@bitwarden/common/tools/send/enums/send-type";
import { Send } from "@bitwarden/common/tools/send/models/domain/send";
import { SendFileView } from "@bitwarden/common/tools/send/models/view/send-file.view";
import { SendTextView } from "@bitwarden/common/tools/send/models/view/send-text.view";
import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";
import { SendApiService } from "@bitwarden/common/tools/send/services/send-api.service.abstraction";
import { SendService } from "@bitwarden/common/tools/send/services/send.service.abstraction";

import { DialogServiceAbstraction, SimpleDialogType } from "../../services/dialog";

@Directive()
export class AddEditComponent implements OnInit, OnDestroy {
  @Input() sendId: string;
  @Input() type: SendType;

  @Output() onSavedSend = new EventEmitter<SendView>();
  @Output() onDeletedSend = new EventEmitter<SendView>();
  @Output() onCancelled = new EventEmitter<SendView>();

  copyLink = false;
  disableSend = false;
  disableHideEmail = false;
  send: SendView;
  deletionDate: string;
  expirationDate: string;
  hasPassword: boolean;
  password: string;
  showPassword = false;
  formPromise: Promise<any>;
  deletePromise: Promise<any>;
  sendType = SendType;
  typeOptions: any[];
  canAccessPremium = true;
  emailVerified = true;
  alertShown = false;
  showOptions = false;

  protected componentName = "";
  private sendLinkBaseUrl: string;
  private destroy$ = new Subject<void>();

  protected formGroup = this.formBuilder.group({
    name: ["", Validators.required],
    text: [],
    textHidden: [false],
    fileContents: [],
    file: [null, Validators.required],
    link: [],
    copyLink: false,
    maxAccessCount: [],
    accessCount: [],
    password: [],
    notes: [],
    hideEmail: false,
    disabled: false,
    type: [],
  });

  constructor(
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected environmentService: EnvironmentService,
    protected datePipe: DatePipe,
    protected sendService: SendService,
    protected messagingService: MessagingService,
    protected policyService: PolicyService,
    protected logService: LogService,
    protected stateService: StateService,
    protected sendApiService: SendApiService,
    protected dialogService: DialogServiceAbstraction,
    protected formBuilder: FormBuilder
  ) {
    this.typeOptions = [
      { name: i18nService.t("sendTypeFile"), value: SendType.File },
      { name: i18nService.t("sendTypeText"), value: SendType.Text },
    ];
    this.sendLinkBaseUrl = this.environmentService.getSendUrl();
  }

  get link(): string {
    if (this.send.id != null && this.send.accessId != null) {
      return this.sendLinkBaseUrl + this.send.accessId + "/" + this.send.urlB64Key;
    }
    return null;
  }

  get isSafari() {
    return this.platformUtilsService.isSafari();
  }

  get isDateTimeLocalSupported(): boolean {
    return !(this.platformUtilsService.isFirefox() || this.platformUtilsService.isSafari());
  }

  async ngOnInit() {
    this.policyService
      .policyAppliesToActiveUser$(PolicyType.DisableSend)
      .pipe(takeUntil(this.destroy$))
      .subscribe((policyAppliesToActiveUser) => {
        this.disableSend = policyAppliesToActiveUser;
        if (this.disableSend) {
          this.formGroup.disable();
        }
      });

    this.policyService
      .policyAppliesToActiveUser$(PolicyType.SendOptions, (p) => p.data.disableHideEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe((policyAppliesToActiveUser) => {
        if ((this.disableHideEmail = policyAppliesToActiveUser)) {
          this.formGroup.controls.hideEmail.disable();
        }
      });

    this.formGroup.controls.type.valueChanges.subscribe((val) => {
      this.type = val;
      this.typeChanged();
    });

    await this.load();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get editMode(): boolean {
    return this.sendId != null;
  }

  get title(): string {
    return this.i18nService.t(this.editMode ? "editSend" : "createSend");
  }

  setDates(event: { deletionDate: string; expirationDate: string }) {
    this.deletionDate = event.deletionDate;
    this.expirationDate = event.expirationDate;
  }

  async load() {
    this.canAccessPremium = await this.stateService.getCanAccessPremium();
    this.emailVerified = await this.stateService.getEmailVerified();

    this.type = !this.canAccessPremium || !this.emailVerified ? SendType.Text : SendType.File;

    if (this.send == null) {
      if (this.editMode) {
        const send = this.loadSend();
        this.send = await send.decrypt();
        this.formGroup.patchValue({
          name: this.send.name,
          text: this.send.text.text,
          textHidden: this.send.text.hidden,
          link: this.link,
          maxAccessCount: this.send.maxAccessCount,
          accessCount: this.send.accessCount,
          notes: this.send.notes,
          hideEmail: this.send.hideEmail,
          disabled: this.send.disabled,
          type: this.send.type,
        });
        this.type = this.send.type;
        if (this.send.hideEmail) {
          this.formGroup.controls.hideEmail.enable();
        }
      } else {
        this.send = new SendView();
        this.send.type = this.type;
        this.send.file = new SendFileView();
        this.send.text = new SendTextView();
        this.send.deletionDate = new Date();
        this.send.deletionDate.setDate(this.send.deletionDate.getDate() + 7);
        this.formGroup.controls.type.patchValue(this.send.type);
      }
    }

    this.hasPassword = this.send.password != null && this.send.password.trim() !== "";
  }

  async submit(): Promise<boolean> {
    this.formGroup.markAllAsTouched();

    if (this.disableSend) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("sendDisabledWarning")
      );
      return false;
    }

    this.send.name = this.formGroup.controls.name.value;
    this.send.text.text = this.formGroup.controls.text.value;
    this.send.text.hidden = this.formGroup.controls.textHidden.value;
    this.send.maxAccessCount = this.formGroup.controls.maxAccessCount.value;
    this.send.accessCount = this.formGroup.controls.accessCount.value;
    this.send.password = this.formGroup.controls.password.value;
    this.send.notes = this.formGroup.controls.notes.value;
    this.send.hideEmail = this.formGroup.controls.hideEmail.value;
    this.send.disabled = this.formGroup.controls.disabled.value;
    this.send.type = this.type;

    if (this.send.name == null || this.send.name === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("nameRequired")
      );
      return false;
    }

    let file: File = null;
    if (this.type === SendType.File && !this.editMode) {
      const fileEl = document.getElementById("file") as HTMLInputElement;
      const files = fileEl.files;
      if (files == null || files.length === 0) {
        this.platformUtilsService.showToast(
          "error",
          this.i18nService.t("errorOccurred"),
          this.i18nService.t("selectFile")
        );
        return;
      }

      file = files[0];
      if (files[0].size > 524288000) {
        // 500 MB
        this.platformUtilsService.showToast(
          "error",
          this.i18nService.t("errorOccurred"),
          this.i18nService.t("maxFileSize")
        );
        return;
      }
    }

    if (
      this.formGroup.controls.password.value != null &&
      this.formGroup.controls.password.value.trim() === ""
    ) {
      this.password = null;
    }

    this.formPromise = this.encryptSend(file).then(async (encSend) => {
      const uploadPromise = this.sendApiService.save(encSend);
      await uploadPromise;
      if (this.send.id == null) {
        this.send.id = encSend[0].id;
      }
      if (this.send.accessId == null) {
        this.send.accessId = encSend[0].accessId;
      }
      this.onSavedSend.emit(this.send);
      if (this.formGroup.controls.copyLink.value && this.formGroup.controls.link.value != null) {
        await this.handleCopyLinkToClipboard();
        return;
      }
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t(this.editMode ? "editedSend" : "createdSend")
      );
    });
    try {
      await this.formPromise;
      return true;
    } catch (e) {
      this.logService.error(e);
    }
    return false;
  }

  async copyLinkToClipboard(link: string): Promise<void | boolean> {
    return Promise.resolve(this.platformUtilsService.copyToClipboard(link));
  }

  protected async delete(): Promise<boolean> {
    if (this.deletePromise != null) {
      return false;
    }

    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "deleteSend" },
      content: { key: "deleteSendConfirmation" },
      type: SimpleDialogType.WARNING,
    });

    if (!confirmed) {
      return false;
    }

    try {
      this.deletePromise = this.sendApiService.delete(this.send.id);
      await this.deletePromise;
      this.platformUtilsService.showToast("success", null, this.i18nService.t("deletedSend"));
      await this.load();
      this.onDeletedSend.emit(this.send);
      return true;
    } catch (e) {
      this.logService.error(e);
    }

    return false;
  }

  typeChanged() {
    if (this.type === SendType.File && !this.alertShown) {
      if (!this.canAccessPremium) {
        this.alertShown = true;
        this.messagingService.send("premiumRequired");
      } else if (!this.emailVerified) {
        this.alertShown = true;
        this.messagingService.send("emailVerificationRequired");
      }
    }
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  protected loadSend(): Send {
    return this.sendService.get(this.sendId);
  }

  protected async encryptSend(file: File): Promise<[Send, EncArrayBuffer]> {
    const sendData = await this.sendService.encrypt(
      this.send,
      file,
      this.formGroup.controls.password.value,
      null
    );

    // Parse dates
    try {
      sendData[0].deletionDate = this.deletionDate == null ? null : new Date(this.deletionDate);
    } catch {
      sendData[0].deletionDate = null;
    }
    try {
      sendData[0].expirationDate =
        this.expirationDate == null ? null : new Date(this.expirationDate);
    } catch {
      sendData[0].expirationDate = null;
    }

    return sendData;
  }

  protected togglePasswordVisible() {
    this.showPassword = !this.showPassword;
    document.getElementById("password").focus();
  }
  private async handleCopyLinkToClipboard() {
    const copySuccess = await this.copyLinkToClipboard(this.formGroup.controls.link.value);
    if (copySuccess ?? true) {
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t(this.editMode ? "editedSend" : "createdSend")
      );
    } else {
      await this.dialogService.openSimpleDialog({
        title: "",
        content: { key: this.editMode ? "editedSend" : "createdSend" },
        acceptButtonText: { key: "ok" },
        cancelButtonText: null,
        type: SimpleDialogType.SUCCESS,
      });

      await this.copyLinkToClipboard(this.formGroup.controls.link.value);
    }
  }
}
