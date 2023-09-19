import { PersistantStateRef } from "../lib/persistantState.ts";

const ref = new PersistantStateRef<number>('num_record', 'localStorage');
console.log(ref.value);

ref.value = 123;
console.log(ref.value);
