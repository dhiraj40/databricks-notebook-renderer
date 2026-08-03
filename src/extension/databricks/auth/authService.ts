import { SecretKeys } from "../../core/configuration/secretKeys";
import { ISecretStorage } from "../../core/storage/secretStorage";
import { AuthApi } from "../api/authApi";
import { Connection } from "../models/connection";
import { CurrentUserResponse } from "../models/response";

export class AuthService {

    constructor(
        private readonly authApi: AuthApi,
        private readonly secretStorage: ISecretStorage
    ) {}

    public async saveConnection(
        workspaceUrl: string,
        token: string
    ): Promise<void> {

        await this.secretStorage.store(
            SecretKeys.WORKSPACE_URL,
            workspaceUrl
        );

        await this.secretStorage.store(
            SecretKeys.TOKEN,
            token
        );
    }

    public async getConnection(): Promise<Connection | undefined> {

        const workspaceUrl =
            await this.secretStorage.get(
                SecretKeys.WORKSPACE_URL
            );

        const token =
            await this.secretStorage.get(
                SecretKeys.TOKEN
            );

        if (!workspaceUrl || !token) {
            return undefined;
        }

        return {
            workspaceUrl,
            token
        };
    }

    public async isAuthenticated(): Promise<boolean> {

        const token =
            await this.secretStorage.get(
                SecretKeys.TOKEN
            );

        return !!token;
    }

    public async connect(connection:  Connection): Promise<CurrentUserResponse> {
        const user = await this.authApi.getCurrentUser(connection);
        await this.saveConnection(connection.workspaceUrl, connection.token);
        return user;
    }

    public async disconnect(): Promise<void> {

        await this.secretStorage.delete(
            SecretKeys.WORKSPACE_URL
        );

        await this.secretStorage.delete(
            SecretKeys.TOKEN
        );
    }
}