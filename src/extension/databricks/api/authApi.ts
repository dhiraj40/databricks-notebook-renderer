import {DatabricksApiEndpoints} from '../constants/apiEndpoints';
import { Connection } from '../models/connection';
import { CurrentUserResponse } from '../models/response';

export class AuthApi {
    public async getCurrentUser(connection: Connection): Promise<CurrentUserResponse> {
        const response = await fetch(
            `${connection.workspaceUrl}${DatabricksApiEndpoints.CURRENT_USER}`,{
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${connection.token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Authentication failed (${response.status})`
            );
        }

        const data = await response.json() as CurrentUserResponse;

        return data;
    }
            
}