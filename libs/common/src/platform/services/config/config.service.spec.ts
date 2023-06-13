import { MockProxy, mock } from "jest-mock-extended";
import { Subject, skip, take } from "rxjs";

import { AuthService } from "../../../auth/abstractions/auth.service";
import { ConfigApiServiceAbstraction } from "../../abstractions/config/config-api.service.abstraction";
import { ServerConfig } from "../../abstractions/config/server-config";
import { EnvironmentService } from "../../abstractions/environment.service";
import { StateService } from "../../abstractions/state.service";
import { ServerConfigData } from "../../models/data/server-config.data";
import {
  EnvironmentServerConfigResponse,
  ServerConfigResponse,
  ThirdPartyServerConfigResponse,
} from "../../models/response/server-config.response";

import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  let stateService: MockProxy<StateService>;
  let configApiService: MockProxy<ConfigApiServiceAbstraction>;
  let authService: MockProxy<AuthService>;
  let environmentService: MockProxy<EnvironmentService>;

  let serverResponseCount: number; // increments to track distinct responses received from server

  const storedConfigData = serverConfigDataFactory("storedConfig");

  beforeEach(() => {
    stateService = mock();
    configApiService = mock();
    authService = mock();
    environmentService = mock();
    environmentService.urls = new Subject();

    serverResponseCount = 1;
    stateService.getServerConfig.mockResolvedValueOnce(storedConfigData);
    configApiService.get.mockImplementation(() =>
      Promise.resolve(serverConfigResponseFactory("server" + serverResponseCount))
    );

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
    it("on initial load", (done) => {
      const configService = configServiceFactory();

      configService.serverConfig$.pipe(skip(2), take(1)).subscribe((config) => {
        try {
          expect(config.gitHash).toEqual("server1");
          done();
        } catch (e) {
          done(e);
        }
      });

      jest.advanceTimersByTime(1);
    });
    it.todo("every hour");
    it.todo("when environment URLs change");
    it.todo("when fetchServerConfig() is called");
  });
  it.todo("Saves config to storage each time it's updated");
});

function serverConfigDataFactory(gitHash: string) {
  return new ServerConfigData(serverConfigResponseFactory(gitHash));
}

function serverConfigResponseFactory(gitHash: string) {
  return new ServerConfigResponse({
    version: "myConfigVersion",
    gitHash: gitHash,
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
}
