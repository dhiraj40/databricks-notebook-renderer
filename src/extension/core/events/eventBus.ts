export type EventHandler = () => void

export class EventBus {

    private readonly listeners = new Map<string, EventHandler[]>();

    public subscribe(event: string, handler: EventHandler): void {
        const handlers = this.listeners.get(event)??[];
        handlers.push(handler);

        this.listeners.set(event, handlers);
    }

    public emit(event: string): void{
        const handlers = this.listeners.get(event)??[];
        for (const handler of handlers){
            handler();
        }
    }

}