
Hooks.once("init", async function () {
    console.log('DataPad init - Registrering Socket')
    game.socket.on("module.bounty-pad", (data) => {
        console.log(data)
        console.log('emmit recieved')
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
    
    game.settings.register("bountyPad", "permissions-emit", {
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
    if ( game.user.role >= game.settings.get("bountyPad", "permissions-emit")) {
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


    async function displayPad(options={}) {
        //if (!game.user.isGM) {

        if ( game.user.role <= game.settings.get("bountyPad", "permissions-emit")) { 
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
        console.log(options)
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
    const bounty = {
    stats: getSection("Bounty|Info|Stats", context.actor.system.biography.value),
    details: getSection("Bounty|Info|Details", context.actor.system.biography.value)
    };
    //bounty.details = stats;
    context.bounty = bounty;
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
