
Hooks.once("init", async function () {
    console.log('DataPad init - Registrering Socket')
    game.socket.on("module.bounty-pad", (data) => {
        displayBountyPad(data);
    })

    game.bountyPad = { 
        displayPad: displayPad,
        emiteBoss: displayPad,
        BountyPad: bountyPadOverlay,
        currentOverlay: null
}

    //Register settings

    const permissionLevels = [
        game.i18n.localize("SETTINGS.bountyPadPermission.Player"),
        game.i18n.localize("SETTINGS.bountyPadPermission.Trusted"),
        game.i18n.localize("SETTINGS.bountyPadPermission.Assistant"),
        game.i18n.localize("SETTINGS.bountyPadPermission.GM")
    ];
    
    game.settings.register("bounty-pad", "permissions-emit", {
        name: "SETTINGS.bountyPadPermission.Title",
        hint: "SETTINGS.bountyPadPermission.TitleHint",
        scope: "world",
        config: true,
        default: 3,
        type: Number,
        choices: permissionLevels,
        onChange: debouncedReload
    });



});


Hooks.on('getActorContextOptions', (html, options)=>{
    if ( game.user.role >= game.settings.get("bounty-pad", "permissions-emit")) {
        options.push(
            {
              "name": `Display DataPad`,
              "icon": `<i class="fa-solid fa-bullhorn"></i>`,
              "element": {},
              callback: li => {
                const selectedActor = li.dataset.documentId ?? li.dataset.entryId;
                displayPad({actor: selectedActor})
              }
            }
          )
    }
});

Hooks.on("renderActorSheet", (app, [html], data) => {       
    
    if ( game.user.role <= game.settings.get("bounty-pad", "permissions-emit")) return 


  const nav = html.querySelector(".fatex-tabs-navigation"); //chekc this selector
  const body = html.querySelector(".fatex-js-tab-content"); //check this selector 
  console.log(html);
  if(!nav || !body) return;

  console.log('found tabs')
  
  nav.insertAdjacentHTML('beforeend',
    `<a class="fatex-tabs-navigation__item"... data-tab="bounty">Bounty Data</a>`
  );

let bountryImg = foundry.applications.elements.HTMLFilePickerElement.create({
    name: "system.flags.bounty.img",
    type: "image",
    value: app.object.system.flags?.bounty.img
  })
let statProse= foundry.applications.elements.HTMLProseMirrorElement.create({name:"system.flags.bounty.stats",toggled: true,value: app.object.system.flags?.bounty.stats, enriched:app.object.system.flags?.bounty.stats});
let detailsProse= foundry.applications.elements.HTMLProseMirrorElement.create({name:"system.flags.bounty.details",toggled: true,value: app.object.system.flags?.bounty.details, enriched:app.object.system.flags?.bounty.details});

  body.insertAdjacentHTML('beforeend', `
    <div data-tab="bounty" class="fatex-tab-content fatex-tab-content--bounty tab">
       <h2>Bounty Image</h2><div>${bountryImg.outerHTML}</div>
       <h2>Bounty Stats</h2><div> ${statProse.outerHTML}</div>
       <h2>Bounty Details</h2> <div>${detailsProse.outerHTML}</div>
    </div>
  `);
});

    async function displayPad(options={}) {
        //if (!game.user.isGM) {

        if ( game.user.role <= game.settings.get("bounty-pad", "permissions-emit")) { 
            ui.notifications.warn(game.i18n.localize("bountyPad.ErrorGM"));
            return;
        }

        let validOptions = false

        if (options.actor) { 
            validOptions = true;
        } else if (options.video) {
            validOptions = true;
        } else if (options.close) { 
            validOptions = true;
        } else if (options.message && options.actorImg) { 
            validOptions = true;
        } else if ( canvas.tokens.controlled.length) {
            options.actor = canvas.tokens.controlled[0]?.document.actorId;
            options.tokenName = canvas.tokens.controlled[0]?.name;
            validOptions = true;
        } 

        if ((!validOptions) && game.user.isGM) {
            ui.notifications.warn(game.i18n.localize("bountyPad.ErrorToken"));
            return;
        }
        await game.socket.emit("module.bounty-pad", options);
        //display for yourself
        displayBountyPad(options);
    }  


function displayBountyPad(options={}) { 

    let overlay = new game.bountyPad.BountyPad(options);
    
    const delayOverlayTimer = setTimeout(async function(){
        overlay.render(true);
        game.bountyPad.currentOverlay = overlay;

    }, 10)

    
}


function getSection(headerText, html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const headers = temp.querySelectorAll("h2");

    for (let i = 0; i < headers.length; i++) {
        if (headers[i].textContent.trim() === headerText) {
        let parts = [];
        let node = headers[i].nextElementSibling;

        // Collect siblings until next H2
        while (node && node.tagName !== "H2") {
            parts.push(node.outerHTML);
            node = node.nextElementSibling;
        }

        return parts.join("").trim();
        }
    }

    return "";
}
    
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
class bountyPadOverlay extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    classes: ['sheet', 'bounty-pad'],
    position: { width: 450, height: 690 },
    tag: 'form',  // REQUIRED for dialogs and forms
    window: {
      resizable: false,
      title: 'Data Pad' // Just the localization key
    }
  }
  static PARTS = {
    form: {
      template: 'modules/bounty-pad/templates/bountyPad.hbs'
    }
  }

   async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = game.actors.get(this.options.actor);
    context.bounty = context.actor.system.flags.bounty;
    return context
  }

    async refresh(force) {
        return foundry.utils.debounce(this.render.bind(this, force), 100)();
    }

    async close(options) { 
        super.close(options);
        game.bountyPad.currentOverlay = null;
    }

    activateListeners(html) {
        super.activateListeners(html);
      }

}
