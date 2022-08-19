import { Component, EventEmitter, Output } from "@angular/core";

import { VaultFilterComponent as BaseVaultFilterComponent } from "@bitwarden/angular/vault/vault-filter/components/vault-filter.component";
import { CipherTypeFilter } from "@bitwarden/angular/vault/vault-filter/models/cipher-filter.model";
import { CollectionFilter } from "@bitwarden/angular/vault/vault-filter/models/collection-filter.model";
import { FolderFilter } from "@bitwarden/angular/vault/vault-filter/models/folder-filter.model";
import { OrganizationFilter } from "@bitwarden/angular/vault/vault-filter/models/organization-filter.model";
import { VaultFilterLabel } from "@bitwarden/angular/vault/vault-filter/models/vault-filter-section";
import { VaultFilter } from "@bitwarden/angular/vault/vault-filter/models/vault-filter.model";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { VaultFilterService } from "@bitwarden/common/abstractions/vault-filter.service";
import { CipherType } from "@bitwarden/common/enums/cipherType";
import { TreeNode } from "@bitwarden/common/models/domain/treeNode";

import { OrganizationOptionsComponent } from "./organization-filter/organization-options.component";

@Component({
  selector: "./app-vault-filter",
  templateUrl: "vault-filter.component.html",
})
export class VaultFilterComponent extends BaseVaultFilterComponent {
  @Output() onSearchTextChanged = new EventEmitter<string>();
  @Output() onAddFolder = new EventEmitter();
  @Output() onEditFolder = new EventEmitter<FolderFilter>();

  searchPlaceholder = this.calculateSearchBarLocalizationString(this.activeFilter);
  searchText = "";

  constructor(
    vaultFilterService: VaultFilterService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService
  ) {
    super(vaultFilterService, i18nService, platformUtilsService);
  }

  async ngOnInit() {
    await super.ngOnInit();
    await this.buildAllFilters();
  }

  searchTextChanged() {
    this.onSearchTextChanged.emit(this.searchText);
  }

  protected async applyVaultFilter(filter: VaultFilter) {
    this.searchPlaceholder = this.calculateSearchBarLocalizationString(filter);
    this.activeFilterChanged.emit(filter);
  }

  applyOrganizationFilter = async (orgNode: TreeNode<OrganizationFilter>): Promise<void> => {
    if (!orgNode.node.enabled) {
      this.platformUtilsService.showToast(
        "error",
        null,
        this.i18nService.t("disabledOrganizationFilterError")
      );
      return;
    }
    const filter = this.activeFilter;
    filter.resetOrganization();
    await this.reloadCollections(orgNode);
    await this.vaultFilterService.ensureVaultFiltersAreExpanded();
    await this.applyVaultFilter(filter);
  };

  applyTypeFilter = async (filterNode: TreeNode<CipherTypeFilter>): Promise<void> => {
    const filter = this.activeFilter;
    filter.resetFilter();
    filter.selectedCipherTypeNode = filterNode;
    await this.applyVaultFilter(filter);
  };

  applyFolderFilter = async (folderNode: TreeNode<FolderFilter>): Promise<void> => {
    const filter = this.activeFilter;
    filter.resetFilter();
    filter.selectedFolderNode = folderNode;
    await this.applyVaultFilter(filter);
  };

  applyCollectionFilter = async (collectionNode: TreeNode<CollectionFilter>): Promise<void> => {
    const filter = this.activeFilter;
    filter.resetFilter();
    filter.selectedCollectionNode = collectionNode;
    await this.applyVaultFilter(filter);
  };

  addFolder = async (): Promise<void> => {
    this.onAddFolder.emit();
  };

  editFolder = async (folder: FolderFilter): Promise<void> => {
    this.onEditFolder.emit(folder);
  };

  calculateSearchBarLocalizationString(vaultFilter: VaultFilter): string {
    if (vaultFilter.selectedCipherTypeNode?.node.type === "favorites") {
      return "searchFavorites";
    }
    if (vaultFilter.selectedCipherTypeNode?.node.type === "trash") {
      return "searchTrash";
    }
    if (
      vaultFilter.selectedCipherTypeNode?.node.type != null &&
      vaultFilter.selectedCipherTypeNode?.node.type !== "all"
    ) {
      return "searchType";
    }
    if (vaultFilter.selectedFolderNode?.node) {
      return "searchFolder";
    }
    if (vaultFilter.selectedCollectionNode?.node.id) {
      return "searchCollection";
    }
    if (vaultFilter.selectedOrganizationNode?.node.id === "MyVault") {
      return "searchMyVault";
    }
    if (vaultFilter.selectedOrganizationNode?.node.id) {
      return "searchOrganization";
    }

    return "searchVault";
  }

  async buildAllFilters() {
    const singleOrgPolicy = await this.vaultFilterService.checkForSingleOrganizationPolicy();
    const personalVaultPolicy = await this.vaultFilterService.checkForPersonalOwnershipPolicy();

    this.filters = {
      [VaultFilterLabel.OrganizationFilter]: {
        data$: await this.vaultFilterService.buildNestedOrganizations(),
        header: {
          showHeader: !(singleOrgPolicy && personalVaultPolicy),
          isSelectable: true,
        },
        action: this.applyOrganizationFilter,
        options: !personalVaultPolicy
          ? {
              component: OrganizationOptionsComponent,
            }
          : null,
        add: !singleOrgPolicy
          ? {
              text: "newOrganization",
              route: "/create-organization",
            }
          : null,
        divider: true,
      },
      [VaultFilterLabel.TypeFilter]: {
        data$: await this.vaultFilterService.buildNestedTypes(
          { id: "all", name: "allItems", type: "all", icon: "" },
          [
            {
              id: "favorites",
              name: this.i18nService.t("favorites"),
              type: "favorites",
              icon: "bwi-star",
            },
            {
              id: "login",
              name: this.i18nService.t("typeLogin"),
              type: CipherType.Login,
              icon: "bwi-globe",
            },
            {
              id: "card",
              name: this.i18nService.t("typeCard"),
              type: CipherType.Card,
              icon: "bwi-credit-card",
            },
            {
              id: "identity",
              name: this.i18nService.t("typeIdentity"),
              type: CipherType.Identity,
              icon: "bwi-id-card",
            },
            {
              id: "note",
              name: this.i18nService.t("typeSecureNote"),
              type: CipherType.SecureNote,
              icon: "bwi-sticky-note",
            },
          ]
        ),
        header: {
          showHeader: true,
          isSelectable: true,
          defaultSelection: true,
        },
        action: this.applyTypeFilter,
      },
      [VaultFilterLabel.FolderFilter]: {
        data$: await this.vaultFilterService.buildNestedFolders(),
        header: {
          showHeader: true,
          isSelectable: false,
        },
        action: await this.applyFolderFilter,
        edit: {
          text: "editFolder",
          action: this.editFolder,
        },
        add: {
          text: "Add Folder",
          action: this.addFolder,
        },
      },
      [VaultFilterLabel.CollectionFilter]: {
        data$: await this.vaultFilterService.buildCollections(),
        header: {
          showHeader: true,
          isSelectable: true,
        },
        action: this.applyCollectionFilter,
      },
      [VaultFilterLabel.TrashFilter]: {
        data$: this.vaultFilterService.buildTrash(),
        header: {
          showHeader: false,
          isSelectable: true,
        },
        action: this.applyTypeFilter,
      },
    };
  }
}
