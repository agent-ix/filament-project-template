// The model of the project: one type, two fields, one operation.
// `make models` turns this description into model/project.semantic-ir.json.
export default {
  identity: "my/project",
  values: { Money: [0, 1000000] },
  objects: {
    Account: {
      fields: { balance: "Money", limit: "Money" },
      ops: {
        withdraw: { params: { amount: "Money" }, modifies: ["balance"] },
      },
    },
  },
  populations: { accounts: ["Account"] },
};
