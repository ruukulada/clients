import { Observable } from "rxjs";

import { FeatureFlag } from "../../../enums/feature-flag.enum";

import { ServerConfig } from "./server-config";

export abstract class ConfigServiceAbstraction {
  serverConfig$: Observable<ServerConfig | null>;
  getFeatureFlag$: <T>(key: FeatureFlag, defaultValue?: T) => Observable<T>;
  getFeatureFlag: <T>(key: FeatureFlag, defaultValue?: T) => Promise<T>;

  /**
   * Force ConfigService to fetch an updated config from the server and emit it from serverConfig$
   * @deprecated The service implementation should subscribe to an observable and use that to trigger a new fetch from
   * server instead
   */
  triggerServerConfigFetch: () => void;
}
