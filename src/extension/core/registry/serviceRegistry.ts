export class ServiceRegistry {
    private readonly services = new Map<string, unknown>();

    register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }

    public get<T>(key: string){
        const service = this.services.get(key);

        if(!service){
            throw new Error(`Service ${key} not found`);
        }

        return service as T;
    }

    public has(
        key: string
    ): boolean {
        return this.services.has(key);
    }
}