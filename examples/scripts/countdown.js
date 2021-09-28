/********************************************************************************
 * Copyright (c) 2018 - 2021 Contributors to the Eclipse Foundation
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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
var Status;
(function (Status) {
    Status[Status["pending"] = 0] = "pending";
    Status[Status["running"] = 1] = "running";
    Status[Status["completed"] = 2] = "completed";
    Status[Status["failed"] = 3] = "failed";
})(Status || (Status = {}));
let countdowns;
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
        stopCountdown: {
            description: "Stops countdown",
            input: {
                type: "string"
            }
        },
        monitorCountdown: {
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
    countdowns = new Map();
    setInterval(() => {
        if (countdowns.size > 0) {
            console.log("Update countdowns");
            let listToDelete = [];
            for (let id of countdowns.keys()) {
                let as = countdowns.get(id);
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
            }
            ;
            for (let id in listToDelete) {
                console.log("Remove countdown for href = " + id);
                countdowns.delete(id);
            }
        }
    }, 1000);
    // set property handlers (using async-await)
    thing.setPropertyReadHandler("numberOfCountdowns", async () => countdowns.size);
    // set action handlers (using async-await)
    thing.setActionHandler("startCountdown", async (params, options) => {
        let initValue = 100;
        // console.log("Params: " + JSON.stringify(params));
        if (params && typeof params === "number") {
            initValue = params;
        }
        let resp = {
            href: uuidv4(),
            output: initValue,
            status: initValue > 0 ? Status.pending : Status.completed
        };
        let ii = resp;
        console.log("init countdown value = " + JSON.stringify(resp));
        countdowns.set(resp.href, resp);
        return ii;
    });
    thing.setActionHandler("stopCountdown", async (params, options) => {
        if (!params || typeof params !== "string" || !countdowns.has(params)) {
            throw Error("Input must be specified and value(not the case for " + params + ")");
        }
        let as = countdowns.get(params);
        as.status = 0;
        console.log("Countdown stopped for href: " + params);
        return undefined;
    });
    thing.setActionHandler("monitorCountdown", async (params, options) => {
        if (!params || typeof params !== "string" || !countdowns.has(params)) {
            throw Error("Input must be specified and value(not the case for " + params + ")");
        }
        let as = countdowns.get(params);
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
