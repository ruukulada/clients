import { Observable } from "rxjs";

import { FeatureFlag } from "../../../enums/feature-flag.enum";

import { ServerConfig } from "./server-config";

export abstract class ConfigServiceAbstraction {
  serverConfig$: Observable<ServerConfig | null>;
  getFeatureFlag$: <T>(key: FeatureFlag, defaultValue?: T) => Observable<T>;
  getFeatureFlag: <T>(key: FeatureFlag, defaultValue?: T) => Promise<T>;
  triggerServerConfigFetch: () => void;
}
