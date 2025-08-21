import { WebSite } from "./core.js";
export class UserStore_WithLoginPassword {
    users = [];
    add(infos) {
        this.users.push(infos);
    }
    setAuthHandler(webSite) {
        webSite.setAuthHandler(loginInfo => {
            let foundUser = this.users.find(e => e.login === loginInfo.login);
            if (!foundUser) {
                return { isOk: false, errorMessage: "Unknown user" };
            }
            if (loginInfo.password !== foundUser.password) {
                return { isOk: false, errorMessage: "Wrong password" };
            }
            return { isOk: true, userInfos: foundUser.userInfos };
        });
    }
}
//# sourceMappingURL=userStores.js.map