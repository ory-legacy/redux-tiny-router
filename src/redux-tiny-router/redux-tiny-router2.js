var qs = require('query-string');
import * as actions from '../actions/actions.js'
import {utils} from '../utils/utils';
import React from 'react';

var skipevent = false;
export function init (store) {

    console.log('init called!');
    window.__UNIVERSAL__ = __UNIVERSAL__ || false;


    var url = __UNIVERSAL__ ? store.getState().router.url : window.location.pathname + window.location.search;
    store.dispatch(actions.rtrUrlChanged(url));

    /* if (!__UNIVERSAL__){
     var url = window.location.pathname + window.location.search;
     // setTimeout(()=>{
     store.dispatch(actions.rtrUrlChanged(url));
     //  },1000);

     } else {
     var url = store.getState().router.url;
     store.dispatch(actions.rtrUrlChanged(url));
     }*/

    window.onbeforeunload = function(e) {
        if (store.getState().router.preventNavigation && store.getState().router.preventNavigationMessage.length > 0){
            return store.getState().router.preventNavigationMessage
        }
    };

    window.onpopstate = function(e){
        if (skipevent) {
            skipevent = false;
            utils.navindex = e.state || 0;  //navindex is necessary as html5 new api did not bless us with information regarding usage of back / forward button
            return
        }

        let index,navindex,direction,url;
        index = e.state || 0;
        navindex = utils.navindex;
        direction = (index < navindex) ? '_back':'_forward';
        url = window.location.pathname + window.location.search;

        if (store.getState().router.preventNavigation){ //if router is preventing navigation
            skipevent = true; //we prevent by doing the opposite the user did (and dont want to infinite loop)
            (index < navindex) ? history.forward() : history.back();
            store.dispatch(actions.rtrUrlChanged(direction,true));
        } else {
            store.dispatch(actions.rtrUrlChanged(url,true)); //business as usual
        }
        utils.navindex = index;
    }


}

export function initUniversal (url,createStore,Layout){

    return new Promise ((resolve,reject) =>{

        global.__CLIENT__ = false;
        console.log('init universal starting...');
        var store = createStore({},'http://'+url),
            state = {},
            reRender = false,
            rendered = false,
            pending,
            html;


        let currentState = store.getState();
        function observeStore(store,  onChange) {

            console.log(store);

            //    console.log('oberseve satarting');
            function handleChange() {
                //          console.log('handeling change');
                let nextState = store.getState();
                console.log(currentState);
                console.log(nextState);

                if (nextState !== currentState) {
                    currentState = nextState;

                    onChange(currentState);


                }
            }
//keep fireing until done is set

            let unsubscribe = store.subscribe(handleChange);
            handleChange();
            return unsubscribe;
        }


        store.dispatch(actions.rtrUniversalSetPeniding(0));
        state = store.getState();

        /*     var unsubscribe2 = observeStore(store,function(state2){
         console.log('i live');
         });*/


        var unsubscribe = observeStore(store,(state)=>{
            //  var unsubscribe = store.subscribe(()=>{
            console.log('event FIRED!');
            state = store.getState();
            //    console.log(state.router.router.pending);
            //    console.log(state);
            //      console.log(state.router.router);
            pending = state.router.pending;
            //   console.log(state);

            if ((pending === 0) && (rendered)){

                //   setTimeout(()=>{
                unsubscribe();
                store.dispatch(actions.rtrUniversalPromiseDone());


                if (reRender){
                    console.log('re - rendering (yes)');
                    html = React.renderToString(<Layout store={store}/>);
                }
                console.log('resolving promise');
                resolve({html,state});
                //   },1000);

            }


            if ((pending === 0) && (!rendered)){
                console.log('rendering...');
                html = React.renderToString(<Layout store={store}/>);
                rendered = true;
            }
            if ((rendered) && (pending > 0)){

                reRender = true;
            }

        });

        store.dispatch(actions.rtrUrlChanged(url.substring(url.indexOf('/'))));
        //  store.dispatch(actions.rtrChangeUrl(url.substring(url.indexOf('/'))));
    });

}

