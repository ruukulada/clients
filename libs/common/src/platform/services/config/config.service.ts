import {
  BehaviorSubject,
  Subject,
  filter,
  firstValueFrom,
  from,
  map,
  merge,
  switchMap,
  tap,
  timer,
} from "rxjs";

import { AuthService } from "../../../auth/abstractions/auth.service";
import { AuthenticationStatus } from "../../../auth/enums/authentication-status";
import { FeatureFlag } from "../../../enums/feature-flag.enum";
import { ConfigApiServiceAbstraction } from "../../abstractions/config/config-api.service.abstraction";
import { ConfigServiceAbstraction } from "../../abstractions/config/config.service.abstraction";
import { ServerConfig } from "../../abstractions/config/server-config";
import { EnvironmentService } from "../../abstractions/environment.service";
import { StateService } from "../../abstractions/state.service";
import { ServerConfigData } from "../../models/data/server-config.data";

export class ConfigService implements ConfigServiceAbstraction {
  protected _serverConfig = new BehaviorSubject<ServerConfig | null>(null);
  serverConfig$ = this._serverConfig.asObservable();
  private _forceFetchConfig = new Subject<void>();

  constructor(
    private stateService: StateService,
    private configApiService: ConfigApiServiceAbstraction,
    private authService: AuthService,
    environmentService: EnvironmentService
  ) {
    // Get config from storage on initial load
    from(this.stateService.getServerConfig())
      .pipe(
        filter((data) => data != null && this._serverConfig.getValue() == null),
        map((data) => new ServerConfig(data))
      )
      .subscribe(this._serverConfig);

    // Fetch config from server
    merge(
      timer(0, 1000 * 3600), // immediately, then every hour
      environmentService.urls, // when environment URLs change
      this._forceFetchConfig // manual
    )
      .pipe(
        switchMap(() => this.configApiService.get()),
        filter((response) => response != null),
        map((response) => new ServerConfigData(response)),
        tap((data) => this.saveConfig(data)),
        map((data) => new ServerConfig(data))
      )
      .subscribe(this._serverConfig);
  }

  getFeatureFlag$<T>(key: FeatureFlag, defaultValue?: T) {
    return this.serverConfig$.pipe(
      map((serverConfig) => {
        if (serverConfig?.featureStates == null || serverConfig.featureStates[key] == null) {
          return defaultValue;
        }

        return serverConfig.featureStates[key] as T;
      })
    );
  }

  async getFeatureFlag<T>(key: FeatureFlag, defaultValue?: T) {
    return await firstValueFrom(this.getFeatureFlag$(key, defaultValue));
  }

  /**
   * Force the service to fetch an updated config from the server, usually on some event like a completed sync
   * If this event has an observable related to it, add that observable to the subscription in the constructor instead
   */
  fetchServerConfig() {
    this._forceFetchConfig.next();
  }

  private async saveConfig(data: ServerConfigData) {
    if ((await this.authService.getAuthStatus()) === AuthenticationStatus.LoggedOut) {
      return;
    }

    await this.stateService.setServerConfig(data);
  }
}
