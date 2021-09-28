/********************************************************************************
 * Copyright (c) 2020 - 2021 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/

import { Helpers } from "@node-wot/core";
let WoTHelpers: Helpers;


function uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

enum Status {
    "pending", "running", "completed", "failed"
}

interface ActionStatus {
    status: Status
    output?: number; // any
    error?: object;
    href?: string;
}

let countdowns: Map<string, ActionStatus>;

WoT.produce({
    title: "countdown",
    description: "Countdown example Thing",
    support: "git://github.com/eclipse/thingweb.node-wot.git",
    "@context": ["https://www.w3.org/2019/wot/td/v1", { iot: "http://example.org/iot" }],
    properties: {
        numberOfCountdowns: {
            type: "integer",
            observable: true,
            readOnly: true,
        }
    },
    actions: {
        startCountdown: {
            description: "Start countdown in secs (default 100 secs)",
            input: {
                type: "integer" // optional
            }
        },
        stopCountdown: { // SHOULD BE DELETE
            description: "Stops countdown",
            input: {
                type: "string"
            }
        },
        monitorCountdown: { // SHOULD BE GET
            description: "Reports current countdown value",
            input: {
                type: "string"
            }
        },
    }
})
    .then((thing) => {
        console.log("Produced " + thing.getThingDescription().title);

        // init property values and start update loop
        countdowns = new Map<string, ActionStatus>();
        setInterval(() => {
            if (countdowns.size > 0) {
                console.log("Update countdowns");
                let listToDelete: string[] = [];
                for (let id of countdowns.keys()) {
                    let as: ActionStatus = countdowns.get(id);
                    if (as.output) {
                        as.output--;
                        as.status = Status.running;

                        if (as.output <= 0) {
                            as.status = Status.completed;
                        }

                        if (as.output < -10) {
                            // remove from list
                            listToDelete.push(id);
                        }
                    }
                };
                for (let id in listToDelete) {
                    console.log("Remove countdown for href = " + id);
                    countdowns.delete(id);
                }
            }
        }, 1000);

        // set property handlers (using async-await)
        thing.setPropertyReadHandler("numberOfCountdowns", async () => countdowns.size);

        // set action handlers (using async-await)
        thing.setActionHandler("startCountdown", async (params : WoT.InteractionOutput, options) : Promise<WoT.InteractionInput> => {
            let initValue = 100;
            // console.log("Params: " + JSON.stringify(params));
            if (params && typeof params === "number") {
                initValue = params;
            }
            let resp: ActionStatus = {
                href: uuidv4(),
                output: initValue,
                status: initValue > 0 ? Status.pending : Status.completed
            }
            let ii : WoT.InteractionInput = resp;
            console.log("init countdown value = " + JSON.stringify(resp));
            countdowns.set(resp.href, resp);
            return ii;
        });
        thing.setActionHandler("stopCountdown", async (params : WoT.InteractionOutput, options) : Promise<WoT.InteractionInput> => {
            if (!params || typeof params !== "string" || !countdowns.has(params)) {
                throw Error("Input must be specified and value(not the case for " + params + ")");
            }
            let as: ActionStatus = countdowns.get(params);
            as.status = 0;
            console.log("Countdown stopped for href: " + params);
            return undefined;
        });
        thing.setActionHandler("monitorCountdown", async (params : WoT.InteractionOutput, options) : Promise<WoT.InteractionInput> => {
            if (!params || typeof params !== "string" || !countdowns.has(params)) {
                throw Error("Input must be specified and value(not the case for " + params + ")");
            }
            let as: ActionStatus = countdowns.get(params);
            return as.status;
        });

        // expose the thing
        thing.expose().then(() => {
            console.info(thing.getThingDescription().title + " ready");
        });
    })
    .catch((e) => {
        console.log(e);
    });
