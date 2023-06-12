import { Observable } from "rxjs";

import { ServerConfig } from "./server-config";
import { FeatureFlag } from "../../../enums/feature-flag.enum";

export abstract class ConfigServiceAbstraction {
  serverConfig$: Observable<ServerConfig | null>;
  getFeatureFlag$: <T>(key: FeatureFlag, defaultValue?: T) => Observable<T>;
  getFeatureFlag: <T>(key: FeatureFlag, defaultValue?: T) => Promise<T>;
  fetchServerConfig: () => void;
}
