import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {applyMiddleware, createStore, Store} from 'redux';
import {Provider} from 'react-redux';
import io from 'socket.io-client';
import {updateState} from './reducers';
import {IStoreState} from './types';
import Draft from './containers/Draft';
import {default as ModelAction} from "./models/Action";
import {Util} from "./models/Util";
import {IJoinedMessage} from "./models/IJoinedMessage";
import Player from "./models/Player";
import PlayerEvent from "./models/PlayerEvent";
import {IDraftConfig} from "./models/IDraftConfig";
import {Action, IActionCompleted, IApplyConfig, IClickOnCiv, ISendJoin, ISetEvents, ISetName} from "./actions";
import {Actions} from "./constants";
import './index.css';
import './i18n';
import {DraftEvent} from "./models/DraftEvent";
import NameGenerator from "./models/NameGenerator";
import {default as i18n} from "./i18n";
import Preset from "./models/Preset";

const createMySocketMiddleware = () => {
    return (storeAPI: { dispatch: (arg0: Action) => void; }) => {
        const socket = io({query: {draftId: Util.getIdFromUrl()}});

        socket.on("player_joined", (data: IJoinedMessage) => {
            console.log("player_joined", data);
            if (data.playerType === Player.HOST || data.playerType === Player.GUEST) {
                storeAPI.dispatch({type: Actions.SET_NAME, player: data.playerType, value: data.name} as ISetName);
            }
        });

        socket.on("playerEvent", (message: PlayerEvent) => {
            console.log('message recieved:', "[act]", JSON.stringify(message));
            storeAPI.dispatch({type: Actions.ACTION_COMPLETED, value: message} as IActionCompleted);
        });

        socket.on("adminEvent", (message: { player: Player, action: ModelAction, events: DraftEvent[] }) => {
            console.log('message recieved:', "[adminEvent]", JSON.stringify(message));
            storeAPI.dispatch({type: Actions.SET_EVENTS, value: message} as ISetEvents);
        });

        return (next: (arg0: any) => void) => (action: Action) => {
            if (action.type === Actions.SEND_JOIN) {
                const sendJoin = action as ISendJoin;
                socket.emit('join', {name: sendJoin.name}, (data: IDraftConfig) => {
                    console.log('join callback', data);
                    storeAPI.dispatch({type: Actions.APPLY_CONFIG, value: data} as IApplyConfig);
                });
                return;
            }

            if (action.type === Actions.CLICK_CIVILISATION) {
                const clickCivilisation = action as IClickOnCiv;
                socket.emit('act', clickCivilisation.playerEvent, clickCivilisation.callback);
            }

            return next(action);
        }
    }
};

const store: Store = createStore<IStoreState, Action, any, Store>(updateState,
    {
        nameHost: "…",
        nameGuest: "…",
        hostReady: false,
        guestReady: false,
        whoAmI: Player.NONE,
        ownName: NameGenerator.getNameFromLocalStorage(),
        preset: Preset.SAMPLE,
        nextAction: 0,
        events: [],
        language: i18n.language,
        showModal: (NameGenerator.getNameFromLocalStorage() === null)
    },
    applyMiddleware(createMySocketMiddleware()));

console.log(store.getState());

ReactDOM.render(
    <Provider store={store}>
        <Draft/>
    </Provider>,
    document.getElementById('root') as HTMLElement
);
// registerServiceWorker();
