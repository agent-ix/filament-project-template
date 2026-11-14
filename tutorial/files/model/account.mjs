// The model of the project after the tutorial change: the account has a second
// operation, `deposit`.
export default {
  identity: "my/project",
  values: { Money: [0, 1000000] },
  objects: {
    Account: {
      fields: { balance: "Money", limit: "Money" },
      ops: {
        withdraw: { params: { amount: "Money" }, modifies: ["balance"] },
        deposit: { params: { amount: "Money" }, modifies: ["balance"] },
      },
    },
  },
  populations: { accounts: ["Account"] },
};
