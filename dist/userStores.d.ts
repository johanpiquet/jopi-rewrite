import { type UserInfos, WebSite } from "./core.ts";
export interface UserLoginPassword {
    login: string;
    password: string;
}
export interface UserInfos_WithLoginPassword extends UserLoginPassword {
    userInfos: UserInfos;
}
export declare class UserStore_WithLoginPassword {
    readonly users: UserInfos_WithLoginPassword[];
    add(infos: UserInfos_WithLoginPassword): void;
    setAuthHandler(webSite: WebSite): void;
}
