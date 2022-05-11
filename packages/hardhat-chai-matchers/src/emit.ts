import { AssertionError } from "chai";
import { Contract, providers, Transaction, utils } from "ethers";

export const EMIT_CALLED = "emitAssertionCalled";

async function waitForPendingTransaction(
  tx: Promise<Transaction> | Transaction | string,
  provider: providers.Provider
) {
  let hash: string | undefined;
  if (tx instanceof Promise) {
    ({ hash } = await tx);
  } else if (typeof tx === "string") {
    hash = tx;
  } else {
    ({ hash } = tx);
  }
  if (hash === undefined) {
    throw new Error(`${JSON.stringify(tx)} is not a valid transaction`);
  }
  return provider.waitForTransaction(hash);
}

export function supportEmit(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    "emit",
    function (this: any, contract: Contract, eventName: string) {
      const tx = this._obj;
      const derivedPromise = waitForPendingTransaction(
        tx,
        contract.provider
      ).then((receipt: providers.TransactionReceipt) => {
        let eventFragment: utils.EventFragment | undefined;
        try {
          eventFragment = contract.interface.getEvent(eventName);
        } catch (e) {
          // ignore error
        }

        if (eventFragment === undefined) {
          throw new AssertionError(
            `Event "${eventName}" doesn't exist in the contract`
          );
        }

        const topic = contract.interface.getEventTopic(eventFragment);
        this.logs = receipt.logs
          .filter((log) => log.topics.includes(topic))
          .filter(
            (log) =>
              log.address.toLowerCase() === contract.address.toLowerCase()
          );

        this.assert(
          this.logs.length > 0,
          `Expected event "${eventName}" to be emitted, but it wasn't`,
          `Expected event "${eventName}" NOT to be emitted, but it was`
        );
      });

      chaiUtils.flag(this, EMIT_CALLED, true);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);
      this.promise = derivedPromise;
      this.contract = contract;
      this.eventName = eventName;
      return this;
    }
  );
}

export async function emitWithArgs(
  context: any,
  Assertion: Chai.AssertionStatic,
  expectedArgs: any[]
) {
  tryAssertArgsArraysEqual(context, Assertion, expectedArgs, context.logs);
}

function assertArgsArraysEqual(
  context: any,
  Assertion: Chai.AssertionStatic,
  expectedArgs: any[],
  log: any
) {
  const actualArgs = (context.contract.interface as utils.Interface).parseLog(
    log
  ).args;
  context.assert(
    actualArgs.length === expectedArgs.length,
    `Expected "${context.eventName}" event to have ${expectedArgs.length} argument(s), ` +
      `but it has ${actualArgs.length}`,
    "Do not combine .not. with .withArgs()",
    expectedArgs.length,
    actualArgs.length
  );
  for (let index = 0; index < expectedArgs.length; index++) {
    if (expectedArgs[index] instanceof Uint8Array) {
      new Assertion(actualArgs[index]).equal(
        utils.hexlify(expectedArgs[index])
      );
    } else if (
      expectedArgs[index]?.length !== undefined &&
      typeof expectedArgs[index] !== "string"
    ) {
      for (let j = 0; j < expectedArgs[index].length; j++) {
        new Assertion(actualArgs[index][j]).equal(expectedArgs[index][j]);
      }
    } else {
      if (
        actualArgs[index].hash !== undefined &&
        actualArgs[index]._isIndexed === true
      ) {
        const expectedArgBytes = utils.isHexString(expectedArgs[index])
          ? utils.arrayify(expectedArgs[index])
          : utils.toUtf8Bytes(expectedArgs[index]);
        new Assertion(actualArgs[index].hash).to.be.oneOf([
          expectedArgs[index],
          utils.keccak256(expectedArgBytes),
        ]);
      } else {
        new Assertion(actualArgs[index]).equal(expectedArgs[index]);
      }
    }
  }
}

const tryAssertArgsArraysEqual = (
  context: any,
  Assertion: Chai.AssertionStatic,
  expectedArgs: any[],
  logs: any[]
) => {
  if (logs.length === 1)
    return assertArgsArraysEqual(context, Assertion, expectedArgs, logs[0]);
  for (const index in logs) {
    if (index === undefined) {
      break;
    } else {
      try {
        assertArgsArraysEqual(context, Assertion, expectedArgs, logs[index]);
        return;
      } catch {}
    }
  }
  context.assert(
    false,
    `Specified args not emitted in any of ${context.logs.length} emitted "${context.eventName}" events`,
    "Do not combine .not. with .withArgs()"
  );
};
