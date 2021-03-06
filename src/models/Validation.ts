import {ValidationId} from "./ValidationId";
import {DraftEvent} from "./DraftEvent";
import ActionType, {actionTypeFromAction} from "./ActionType";
import PlayerEvent from "./PlayerEvent";
import Civilisation from "./Civilisation";
import Player from "./Player";
import {Util} from "./Util";
import Draft from "./Draft";

export class Validation {
    public static readonly VLD_000: Validation = new Validation(ValidationId.VLD_000, (draft:Draft, draftEvent: DraftEvent) => {
        if (!draft.draftCanBeStarted()) {
            return false;
        }
        if (!draft.hasNextAction()) {
            return false;
        }
        return true;
    });
    public static readonly VLD_001: Validation = new Validation(ValidationId.VLD_001, (draft: Draft, draftEvent: DraftEvent) => {
        const expectedAction = draft.getExpectedAction();
        if (expectedAction !== null) {
            return expectedAction.player === draftEvent.player;
        }
        return true;
    });

    public static readonly VLD_002: Validation = new Validation(ValidationId.VLD_002, (draft: Draft, draftEvent: DraftEvent) => {
        const expectedAction = draft.getExpectedAction();
        if (expectedAction !== null) {
            if (Util.isPlayerEvent(draftEvent)) {
                const playerEvent = draftEvent as PlayerEvent;
                const expectedActionType = actionTypeFromAction(expectedAction.action);
                return playerEvent.actionType === expectedActionType;
            }
        }
        return true;
    });

    public static readonly VLD_100: Validation = new Validation(ValidationId.VLD_100, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            const globalBans: Civilisation[] = draft.getGlobalBans();
            if (Validation.includes(globalBans, playerEvent.civilisation)) {
                return false;
            }
        }
        return true;
    });

    public static readonly VLD_101: Validation = new Validation(ValidationId.VLD_101, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            if (playerEvent.actionType !== ActionType.PICK) {
                return true;
            }
            const bansForPlayer = draft.getBansForPlayer(playerEvent.player);
            if (Validation.includes(bansForPlayer, playerEvent.civilisation)) {
                return false;
            }
        }
        return true;
    });

    public static readonly VLD_102: Validation = new Validation(ValidationId.VLD_102, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            if (playerEvent.actionType !== ActionType.PICK) {
                return true;
            }
            const exclusivePicks = draft.getExclusivePicks(playerEvent.player);
            if (Validation.includes(exclusivePicks, playerEvent.civilisation)) {
                return false;
            }
        }
        return true;
    });

    public static readonly VLD_103: Validation = new Validation(ValidationId.VLD_103, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            if (playerEvent.actionType !== ActionType.PICK) {
                return true;
            }
            const exclusivePicks = draft.getGlobalPicks();
            if (Validation.includes(exclusivePicks, playerEvent.civilisation)) {
                return false;
            }
        }
        return true;
    });

    public static readonly VLD_200: Validation = new Validation(ValidationId.VLD_200, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            if (playerEvent.actionType !== ActionType.BAN) {
                return true;
            }
            const exclusiveBansByPlayer = draft.getExclusiveBansByPlayer(playerEvent.player);
            if (Validation.includes(exclusiveBansByPlayer, playerEvent.civilisation)) {
                return false;
            }
        }
        return true;
    });

    public static readonly VLD_300: Validation = new Validation(ValidationId.VLD_300, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            if (playerEvent.actionType !== ActionType.SNIPE || playerEvent.player === Player.NONE) {
                return true;
            }
            const opponent: Player = playerEvent.player === Player.HOST ? Player.GUEST : Player.HOST;
            const picksByOpponent: Civilisation[] = draft.getPicks(opponent);
            if (!Validation.includes(picksByOpponent, playerEvent.civilisation)) {
                return false;
            }
        }
        return true;
    });

    public static readonly VLD_301: Validation = new Validation(ValidationId.VLD_301, (draft: Draft, draftEvent: DraftEvent) => {
        if (!draft.hasNextAction()) {
            return true;
        }
        if (Util.isPlayerEvent(draftEvent)) {
            const playerEvent = draftEvent as PlayerEvent;
            if (playerEvent.actionType !== ActionType.SNIPE || playerEvent.player === Player.NONE) {
                return true;
            }
            const opponent: Player = playerEvent.player === Player.HOST ? Player.GUEST : Player.HOST;
            const picksByOpponent: Civilisation[] = draft.getPicks(opponent);
            const snipes: Civilisation[] = draft.getSnipes(playerEvent.player);
            snipes.push(playerEvent.civilisation);
            if (Validation.includes(picksByOpponent, playerEvent.civilisation)) {
                for (let sniped of snipes) {
                    if (!Validation.includes(picksByOpponent, sniped)) {
                        return false;
                    }
                    const index = picksByOpponent.indexOf(sniped);
                    delete picksByOpponent[index];
                }
            }
        }
        return true;
    });

    public static readonly ALL: Validation[] = [
        Validation.VLD_000,
        Validation.VLD_001,
        Validation.VLD_002,

        Validation.VLD_100,
        Validation.VLD_101,
        Validation.VLD_102,
        Validation.VLD_103,

        Validation.VLD_200,

        Validation.VLD_300,
        Validation.VLD_301
    ];

    private readonly validationId: ValidationId;

    private readonly validate: (draft: Draft, draftEvent: DraftEvent) => boolean;

    constructor(validationId: ValidationId, validate: (draft: Draft, draftEvent: DraftEvent) => boolean) {
        this.validationId = validationId;
        this.validate = validate;
    }

    public apply(draft: Draft, draftEvent: DraftEvent): ValidationId | undefined {
        if (!this.validate(draft, draftEvent)) {
            return this.validationId;
        }
        return undefined;
    }

    private static includes(bansForPlayer: Civilisation[], civilisation: Civilisation) {
        return bansForPlayer
            .filter(it => it.name === civilisation.name && it.gameVersion === civilisation.gameVersion).length > 0;
    }
}