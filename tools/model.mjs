// Prototype-only stand-in for the missing newcomer route to a domain model
// (see FINDINGS.md / QSL-1980). Reads a compact model description (an .mjs
// module whose default export is described below) and writes the
// semantic-ir/2.0.0 document the driver admits.
//
//   node model.mjs <description.mjs> <out.json>
//
// description = {
//   identity: "example/shop",
//   values:  { Cents: [0, 1000000] },             // bounded integer value types
//   enums:   { Status: ["Open", "Paid"] },        // variant types
//   objects: { Order: { fields: {...}, ops: {...} } },
//   populations: { orders: ["Order"] },
// }
// field = "Cents" | "Boolean" | "Integer" | "Order" (reference) |
//         { type, optional: true } | { type, many: [lower, upper], ordered, unique }
// op = { params: { name: field }, modifies: ["field"], returns: "Boolean" }
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [descPath, out] = process.argv.slice(2);
const d = (await import(pathToFileURL(resolve(descPath)).href)).default;
const P = d.identity;
const id = (s) => `ix://${P}/${s}`;
const gen = (identity) => ({
  generated: { generatorIdentity: identity, generatorVersion: "1.0.0", inputIdentities: [identity] },
});
const NATIVE = { Boolean: 1, Integer: 1, String: 1, UUID: 1, Timestamp: 1 };
const typeRef = (t) => (NATIVE[t] ? `ix://quire/native/${t}` : id(t));
const one = { lower: 1, upper: 1, ordered: false, unique: true };
const member = (owner, name, spec) => {
  const s = typeof spec === "string" ? { type: spec } : spec;
  const identity = id(`${owner}/${name}`);
  const multiplicity = s.many
    ? { lower: s.many[0], upper: s.many[1], ordered: !!s.ordered, unique: s.unique !== false }
    : one;
  return {
    identity, name, typeRef: typeRef(s.type),
    presence: s.optional ? "optional" : "required",
    nullable: false, defaultKind: "none", multiplicity, origin: gen(identity),
  };
};
const construct = (name, meaning, shape = "record", members = {}) => ({
  kind: { module: P, name }, moduleVersion: "1.0.0",
  construct: { identity: "none", shape, members, meaning },
});
const types = [];
for (const [name, [min, max]] of Object.entries(d.values ?? {})) {
  const identity = id(name);
  const c = (keyword, value) => ({
    identity: `${identity}/constraints/${keyword}`, keyword, operands: { value: String(value) },
    appliesTo: "ix://quire/native/Integer", diagnosticCode: `bound.${keyword}`, origin: gen(identity),
  });
  types.push({
    identity, displayName: name, kind: { module: P, name: "value_type" }, roles: [],
    origin: gen(identity), extensions: [], unknownPolicy: "reject", scalar: "integer",
    constraints: [c("min", min), c("max", max)],
  });
}
for (const [name, cases] of Object.entries(d.enums ?? {})) {
  const identity = id(name);
  types.push({
    identity, displayName: name, kind: { module: P, name: "variant_type" }, roles: [],
    origin: gen(identity), constraints: [], extensions: [], unknownPolicy: "reject",
    variants: cases.map((c) => ({ identity: id(`variant/${name}-${c}`), name: c, origin: { source: { sourceIdentity: id("spec"), path: "spec.qspec", startLine: 1, startColumn: 1 } } })),
  });
}
for (const [name, o] of Object.entries(d.objects ?? {})) {
  const identity = id(name);
  types.push({
    identity, displayName: name, kind: { module: P, name: "object_type" }, roles: [],
    origin: gen(identity), constraints: [], extensions: [], unknownPolicy: "reject", supertypes: [],
    fields: Object.entries(o.fields ?? {}).map(([f, s]) => member(name, f, s)),
    operations: Object.entries(o.ops ?? {}).map(([op, s]) => {
      const oid = id(`${name}/${op}`);
      return {
        identity: oid, name: op,
        params: Object.entries(s.params ?? {}).map(([p, ps]) => member(`${name}/${op}`, p, ps)),
        returns: { typeRef: typeRef(s.returns ?? "Boolean"), multiplicity: one, nullable: false },
        pre: [], post: [], origin: gen(oid),
        frame: { modifies: (s.modifies ?? []).map((f) => id(`${name}/${f}`)), creates: [], deletes: [] },
      };
    }),
  });
}
for (const [name, fields] of Object.entries(d.records ?? {})) {
  const identity = id(name);
  types.push({
    identity, displayName: name, kind: { module: P, name: "message" }, roles: [],
    origin: gen(identity), constraints: [], extensions: [], unknownPolicy: "reject", supertypes: [],
    fields: Object.entries(fields).map(([f, s]) => member(name, f, s)), operations: [],
  });
}
const constructs = [
  construct("object_type", "quire.meaning.model.object-type/v1"),
  construct("population", "quire.meaning.model.population/v1"),
];
if (d.records) constructs.push(construct("message", "quire.meaning.model.record-value-type/v1"));
if (d.values) constructs.push(construct("value_type", "quire.meaning.model.value-type/v1"));
if (d.enums) constructs.push(construct("variant_type", "quire.meaning.model.variant-type/v1", "enumeration", { variants: "required" }));
const doc = {
  contractVersion: "2.0.0",
  canonicalization: { algorithm: "rfc8785-v1" },
  source: { identity: id("spec"), version: "1.0.0", dialect: "spec-bundle" },
  package: { identity: P, version: "1.0.0", mappingVersions: [], profileVersions: [] },
  occurrences: [], extensions: [], constructs, types,
  populations: Object.entries(d.populations ?? {}).map(([name, members]) => ({
    identity: id(name), displayName: name, kind: { module: P, name: "population" },
    members: members.map(id), extent: "closed", origin: gen(id(name)),
  })),
};
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
