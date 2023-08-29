// import { mockEnc, mockFromJson } from "../../../../spec";
// import { UriMatchType } from "../../../enums";
// import { EncryptedString, EncString } from "../../../platform/models/domain/enc-string";
import { Fido2KeyData } from "../data/fido2-key.data";

import { Fido2Key } from "./fido2-key";

describe("Fido2Key", () => {
  it("Convert from empty Fido2Key", () => {
    const data = new Fido2KeyData();
    const fido2Key = new Fido2Key(data);

    expect(fido2Key).toEqual({
      nonDiscoverableId: null,
      keyType: null,
      keyAlgorithm: null,
      keyCurve: null,
      keyValue: null,
      rpId: null,
      userHandle: null,
      rpName: null,
      userName: null,
      origin: null,
      counter: null,
    });
  });

  it("Convert from full Fido2KeyData", () => {
    const data: Fido2KeyData = {
      nonDiscoverableId: "nonDiscoverableId",
      keyType: "public-key",
      keyAlgorithm: "ECDSA",
      keyCurve: "P-256",
      keyValue: "keyValue",
      rpId: "rpId",
      userHandle: "userHandle",
      counter: "counter",
      rpName: "rpName",
      userName: "userName",
    };
    const fido2Key = new Fido2Key(data);

    expect(fido2Key).toEqual({
      nonDiscoverableId: { encryptedString: "nonDiscoverableId", encryptionType: 0 },
      keyType: { encryptedString: "public-key", encryptionType: 0 },
      keyAlgorithm: { encryptedString: "ECDSA", encryptionType: 0 },
      keyCurve: { encryptedString: "P-256", encryptionType: 0 },
      keyValue: { encryptedString: "keyValue", encryptionType: 0 },
      rpId: { encryptedString: "rpId", encryptionType: 0 },
      userHandle: { encryptedString: "userHandle", encryptionType: 0 },
      counter: { encryptedString: "counter", encryptionType: 0 },
      rpName: { encryptedString: "rpName", encryptionType: 0 },
      userName: { encryptedString: "userName", encryptionType: 0 },
    });
  });

  it.only("Initialize without Fido2KeyData", () => {
    const fido2Key = new Fido2Key();
    console.log(fido2Key);

    expect(fido2Key).toEqual({
      nonDiscoverableId: null,
      keyType: null,
      keyAlgorithm: null,
      keyCurve: null,
      keyValue: null,
      rpId: null,
      userHandle: null,
      rpName: null,
      userName: null,
      origin: null,
      counter: null,
    });
  });

  // it("Decrypts correctly", async () => {
  //   const loginUri = Substitute.for<LoginUri>();
  //   const loginUriView = new LoginUriView();
  //   loginUriView.uri = "decrypted uri";
  //   loginUri.decrypt(Arg.any()).resolves(loginUriView);

  //   const login = new Login();
  //   login.uris = [loginUri];
  //   login.username = mockEnc("encrypted username");
  //   login.password = mockEnc("encrypted password");
  //   login.passwordRevisionDate = new Date("2022-01-31T12:00:00.000Z");
  //   login.totp = mockEnc("encrypted totp");
  //   login.autofillOnPageLoad = true;

  //   const loginView = await login.decrypt(null);
  //   expect(loginView).toEqual({
  //     username: "encrypted username",
  //     password: "encrypted password",
  //     passwordRevisionDate: new Date("2022-01-31T12:00:00.000Z"),
  //     totp: "encrypted totp",
  //     uris: [
  //       {
  //         match: null,
  //         _uri: "decrypted uri",
  //         _domain: null,
  //         _hostname: null,
  //         _host: null,
  //         _canLaunch: null,
  //       },
  //     ],
  //     autofillOnPageLoad: true,
  //   });
  // });

  // it("Converts from LoginData and back", () => {
  //   const data: LoginData = {
  //     uris: [{ uri: "uri", match: UriMatchType.Domain }],
  //     username: "username",
  //     password: "password",
  //     passwordRevisionDate: "2022-01-31T12:00:00.000Z",
  //     totp: "123",
  //     autofillOnPageLoad: false,
  //   };
  //   const login = new Login(data);

  //   const loginData = login.toLoginData();

  //   expect(loginData).toEqual(data);
  // });

  // describe("fromJSON", () => {
  //   it("initializes nested objects", () => {
  //     jest.spyOn(EncString, "fromJSON").mockImplementation(mockFromJson);
  //     jest.spyOn(LoginUri, "fromJSON").mockImplementation(mockFromJson);
  //     const passwordRevisionDate = new Date("2022-01-31T12:00:00.000Z");

  //     const actual = Login.fromJSON({
  //       uris: ["loginUri1", "loginUri2"] as any,
  //       username: "myUsername" as EncryptedString,
  //       password: "myPassword" as EncryptedString,
  //       passwordRevisionDate: passwordRevisionDate.toISOString(),
  //       totp: "myTotp" as EncryptedString,
  //       fido2Key: {
  //         nonDiscoverableId: "keyId" as EncryptedString,
  //         keyType: "keyType" as EncryptedString,
  //         keyAlgorithm: "keyAlgorithm" as EncryptedString,
  //         keyCurve: "keyCurve" as EncryptedString,
  //         keyValue: "keyValue" as EncryptedString,
  //         rpId: "rpId" as EncryptedString,
  //         userHandle: "userHandle" as EncryptedString,
  //         counter: "counter" as EncryptedString,
  //         rpName: "rpName" as EncryptedString,
  //         userName: "userName" as EncryptedString,
  //         origin: "origin" as EncryptedString,
  //       },
  //     });

  //     expect(actual).toEqual({
  //       uris: ["loginUri1_fromJSON", "loginUri2_fromJSON"] as any,
  //       username: "myUsername_fromJSON",
  //       password: "myPassword_fromJSON",
  //       passwordRevisionDate: passwordRevisionDate,
  //       totp: "myTotp_fromJSON",
  //       fido2Key: {
  //         nonDiscoverableId: "keyId_fromJSON",
  //         keyType: "keyType_fromJSON",
  //         keyAlgorithm: "keyAlgorithm_fromJSON",
  //         keyCurve: "keyCurve_fromJSON",
  //         keyValue: "keyValue_fromJSON",
  //         rpId: "rpId_fromJSON",
  //         userHandle: "userHandle_fromJSON",
  //         counter: "counter_fromJSON",
  //         rpName: "rpName_fromJSON",
  //         userName: "userName_fromJSON",
  //         origin: "origin_fromJSON",
  //       },
  //     });
  //     expect(actual).toBeInstanceOf(Login);
  //   });

  //   it("returns null if object is null", () => {
  //     expect(Login.fromJSON(null)).toBeNull();
  //   });
  // });
});
