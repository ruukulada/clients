import { MockProxy, mock } from "jest-mock-extended";
import { skip, take } from "rxjs";

import { AuthService } from "../../../auth/abstractions/auth.service";
import { ConfigApiServiceAbstraction } from "../../abstractions/config/config-api.service.abstraction";
import { ServerConfig } from "../../abstractions/config/server-config";
import { EnvironmentService } from "../../abstractions/environment.service";
import { StateService } from "../../abstractions/state.service";
import { ServerConfigData } from "../../models/data/server-config.data";
import {
  EnvironmentServerConfigResponse,
  ThirdPartyServerConfigResponse,
} from "../../models/response/server-config.response";

import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  let stateService: MockProxy<StateService>;
  let configApiService: MockProxy<ConfigApiServiceAbstraction>;
  let authService: MockProxy<AuthService>;
  let environmentService: MockProxy<EnvironmentService>;

  const storedConfigData = serverConfigDataFactory();

  beforeEach(() => {
    stateService = mock();
    configApiService = mock();
    authService = mock();
    environmentService = mock();
  });

  // Observables will start emitting as soon as this is created, so only create it
  // after everything is mocked
  const configServiceFactory = () =>
    new ConfigService(stateService, configApiService, authService, environmentService);

  it("Emits config from storage on initial load", (done) => {
    stateService.getServerConfig.mockResolvedValueOnce(storedConfigData);

    const configService = configServiceFactory();

    // skip the initial null value
    configService.serverConfig$.pipe(skip(1), take(1)).subscribe((config) => {
      expect(config).toEqual(new ServerConfig(storedConfigData));
      done();
    });
  });

  describe("Fetches config from server", () => {
    it.todo("on initial load");
    it.todo("every hour");
    it.todo("when environment URLs change");
    it.todo("when fetchServerConfig() is called");
  });
  it.todo("Saves config to storage each time it's updated");
});

function serverConfigDataFactory() {
  const data = new ServerConfigData({
    version: "myConfigVersion",
    gitHash: "myGitHash",
    server: new ThirdPartyServerConfigResponse({
      name: "myThirdPartyServer",
      url: "www.example.com",
    }),
    environment: new EnvironmentServerConfigResponse({
      vault: "vault.example.com",
    }),
    featureStates: {
      feat1: "off",
      feat2: "on",
      feat3: "off",
    },
  });

  return data;
}
