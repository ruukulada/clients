import {
  ReplaySubject,
  Subject,
  concat,
  concatMap,
  delayWhen,
  filter,
  firstValueFrom,
  from,
  map,
  merge,
  takeWhile,
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
  protected _serverConfig = new ReplaySubject<ServerConfig | null>(1);
  serverConfig$ = this._serverConfig.asObservable();
  private _forceFetchConfig = new Subject<void>();

  constructor(
    private stateService: StateService,
    private configApiService: ConfigApiServiceAbstraction,
    private authService: AuthService,
    environmentService: EnvironmentService
  ) {
    // Get config from storage on initial load
    const configFromStorage$ = from(this.stateService.getServerConfig()).pipe(
      takeWhile((data) => data != null),
      map((data) => new ServerConfig(data))
    );

    // Fetch config from server
    // If you need to fetch a new config when an event occurs, add an observable that emits on that event here
    const configFromServer$ = merge(
      timer(0, 1000 * 3600), // immediately, then every hour
      environmentService.urls, // when environment URLs change
      this._forceFetchConfig // manual
    ).pipe(
      concatMap(() => this.configApiService.get()),
      filter((response) => response != null),
      map((response) => new ServerConfigData(response)),
      delayWhen((data) => this.saveConfig(data)),
      map((data) => new ServerConfig(data))
    );

    concat(configFromStorage$, configFromServer$).subscribe((config) =>
      this._serverConfig.next(config)
    );
  }

  getFeatureFlag$<T extends boolean | number | string>(key: FeatureFlag, defaultValue?: T) {
    return this.serverConfig$.pipe(
      map((serverConfig) => {
        if (serverConfig?.featureStates == null || serverConfig.featureStates[key] == null) {
          return defaultValue;
        }

        return serverConfig.featureStates[key] as T;
      })
    );
  }

  async getFeatureFlag<T extends boolean | number | string>(key: FeatureFlag, defaultValue?: T) {
    return await firstValueFrom(this.getFeatureFlag$(key, defaultValue));
  }

  triggerServerConfigFetch() {
    this._forceFetchConfig.next();
  }

  private async saveConfig(data: ServerConfigData) {
    if ((await this.authService.getAuthStatus()) === AuthenticationStatus.LoggedOut) {
      return;
    }

    await this.stateService.setServerConfig(data);
  }
}
