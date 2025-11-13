# Communicate between modules

Modules should communicate using the framework's event/listener APIs to keep them decoupled.

Approach:
- Emit events for actions or state changes.
- Other modules subscribe to those events and react accordingly.

Best practices:
- Keep event payloads small and well-documented.
- Avoid tight coupling by not calling module internals directly.

## The event-based communication principle

Modules are highly decoupled, which reduces their dependencies and makes the application easier to maintain. They can share pieces, but sometimes they need a way to communicate more directly.

That's where a mechanism comes in that allows a module to notify other modules that an event has occurred while passing some information. It's like speaking into a loudspeaker: who hears it? We don't know, but whatever is said is heard and triggers reactions.

For example, an event can indicate that the user has just logged in: as a result, the UI module will refresh menus to reflect that the user is no longer anonymous.

## The problem with events

The proposed communication mechanism is event-based. The issue with such a mechanism is that it can be incompatible with bundlers (Vite.js / WebPack / ...). Internally Jopi also uses a bundler. If you try to implement such a mechanism naively, you may observe inconsistent behavior due to bundler side-effects.

These side-effects happen because bundlers perform static analysis: they do not execute the code to know who listens to an event. Then they prune: they remove code that appears unreferenced to produce much smaller JavaScript bundles.

This is why Jopi requires events to be declared statically so bundlers can analyze them and ensure the JavaScript is included correctly.

## Listening to an event

Events are declared statically so the internal bundler can understand that our module listens to certain items.

**Example of adding listeners**

```
|- mod_moduleA/
 |- @alias/
  |- events/                 < Where our module events are declared
   |- myEventName            < The name for this event
	  |- listenerA           < Names determine the event order (sorted ASC)
	     |- index.ts         < Who listens to this event
    |- mySecondListener
    |- myThirdListener
```

Each listener has a name. The purpose of this name is to indicate its priority order in the event call list. These names are sorted alphabetically (ASC) which determines who should be called before or after.

Here the file `index.ts` exports a default function that is called when the event is triggered. This function must be synchronous (no `async` / `Promise`). The reason is that most events are triggered from synchronous functions, and asynchronous listeners would cause incompatibilities.

**index.ts file**
```typescript
export default function(eventData: any, eventName: string) {
  console.log(`Event ${eventName} received with data`, eventData);
}
```

## Emitting an event

Here is an example showing how to emit an event.

```typescript
import myEventName from "@/events/myEventName";
await myEventName.send({hello: "world"});
```

The only constraint is that the event must exist. You therefore need to create an event declaration, even if it has no listeners.

**Declaring an event without listeners**
```
|- mod_moduleB/
  |  @alias/
     |- events/
        |- myEventB    < There is no listener, but now the event exists
```

Another method to trigger events is to use `jk_events` directly. This method exists but is discouraged in the UI because of the concerns described regarding the bundler. It is mentioned here for completeness but not recommended.

```typescript
import * as jk_events from "jopi-toolkit/jk_events";
jk_events.sendAsyncEvent("myEventName", entry);
```
