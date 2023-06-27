import { Observable } from "rxjs";
import localforage from "localforage";
import { extendPrototype } from "localforage-observable";

// extends the lf prototype with observable powers
const lf = extendPrototype(localforage);

lf.newObservable.factory = (subscribeFn) => new Observable(subscribeFn);

export default lf;
