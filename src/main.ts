import './index.css';
import { KeyboardEventTypes, Vector3 } from '@babylonjs/core';
import type { Camera, Mesh } from '@babylonjs/core';
import { GameEngine } from './engine/GameEngine';
import { SceneManager } from './engine/scene/SceneManager';
import { gameState, gameStateStore } from './game/state/GameState';
import { transitionMission } from './game/state/MissionState';
import { dataManager } from './game/state/DataManager';
import type { InteractionSystem } from './game/InteractionSystem';
import type { FirstPersonController } from './engine/player/FirstPersonController';
import type { HUD } from './ui/hud/HUD';
import type { MissionBoardUI } from './ui/missionBoard/MissionBoardUI';
import type { DebriefUI } from './ui/debrief/DebriefUI';
import type { ShopUI } from './ui/shop/ShopUI';
import type { PerkMenuUI } from './ui/perks/PerkMenuUI';
import type { DecryptionUI } from './ui/DecryptionUI';
import type { LoadingUI } from './ui/LoadingUI';
import type { MainMenuUI } from './ui/menu/MainMenuUI';
import type { InventoryUI } from './ui/inventory/InventoryUI';
import type { HealthSystem } from './game/state/HealthSystem';
import type { WeaponSystem } from './game/combat/WeaponSystem';
import type { Interactable } from './game/interactions/Interactable';

type HubModuleBundle = {
  buildHubScene: typeof import('./game/hub/HubScene').buildHubScene;
  FirstPersonController: typeof import('./engine/player/FirstPersonController').FirstPersonController;
  InteractionSystem: typeof import('./game/InteractionSystem').InteractionSystem;
  HUD: typeof import('./ui/hud/HUD').HUD;
  MissionBoardUI: typeof import('./ui/missionBoard/MissionBoardUI').MissionBoardUI;
  ShopUI: typeof import('./ui/shop/ShopUI').ShopUI;
  PerkMenuUI: typeof import('./ui/perks/PerkMenuUI').PerkMenuUI;
  DecryptionUI: typeof import('./ui/DecryptionUI').DecryptionUI;
  DebriefUI: typeof import('./ui/debrief/DebriefUI').DebriefUI;
};

type MissionModuleBundle = {
  buildMissionZone: typeof import('./game/missions/MissionZone').buildMissionZone;
  FirstPersonController: typeof import('./engine/player/FirstPersonController').FirstPersonController;
  InteractionSystem: typeof import('./game/InteractionSystem').InteractionSystem;
  HUD: typeof import('./ui/hud/HUD').HUD;
  WeaponSystem: typeof import('./game/combat/WeaponSystem').WeaponSystem;
  OxygenSystem: typeof import('./game/state/OxygenSystem').OxygenSystem;
  ExtractionSystem: typeof import('./game/state/ExtractionSystem').ExtractionSystem;
  HealthSystem: typeof import('./game/state/HealthSystem').HealthSystem;
  Turret: typeof import('./game/entities/Turret').Turret;
};

let sharedUiPromise:
  | Promise<{
      MainMenuUI: typeof import('./ui/menu/MainMenuUI').MainMenuUI;
      LoadingUI: typeof import('./ui/LoadingUI').LoadingUI;
      InventoryUI: typeof import('./ui/inventory/InventoryUI').InventoryUI;
    }>
  | null = null;
let hubModulesPromise: Promise<HubModuleBundle> | null = null;
let missionModulesPromise: Promise<MissionModuleBundle> | null = null;

function loadSharedUi() {
  sharedUiPromise ??= Promise.all([
    import('./ui/menu/MainMenuUI'),
    import('./ui/LoadingUI'),
    import('./ui/inventory/InventoryUI'),
  ]).then(([menu, loading, inventory]) => ({
    MainMenuUI: menu.MainMenuUI,
    LoadingUI: loading.LoadingUI,
    InventoryUI: inventory.InventoryUI,
  }));
  return sharedUiPromise;
}

function loadHubModules() {
  hubModulesPromise ??= Promise.all([
    import('./game/hub/HubScene'),
    import('./engine/player/FirstPersonController'),
    import('./game/InteractionSystem'),
    import('./ui/hud/HUD'),
    import('./ui/missionBoard/MissionBoardUI'),
    import('./ui/shop/ShopUI'),
    import('./ui/perks/PerkMenuUI'),
    import('./ui/DecryptionUI'),
    import('./ui/debrief/DebriefUI'),
  ]).then(
    ([
      hubScene,
      playerController,
      interactionSystem,
      hud,
      missionBoard,
      shop,
      perks,
      decryption,
      debrief,
    ]) => ({
      buildHubScene: hubScene.buildHubScene,
      FirstPersonController: playerController.FirstPersonController,
      InteractionSystem: interactionSystem.InteractionSystem,
      HUD: hud.HUD,
      MissionBoardUI: missionBoard.MissionBoardUI,
      ShopUI: shop.ShopUI,
      PerkMenuUI: perks.PerkMenuUI,
      DecryptionUI: decryption.DecryptionUI,
      DebriefUI: debrief.DebriefUI,
    })
  );
  return hubModulesPromise;
}

function loadMissionModules() {
  missionModulesPromise ??= Promise.all([
    import('./game/missions/MissionZone'),
    import('./engine/player/FirstPersonController'),
    import('./game/InteractionSystem'),
    import('./ui/hud/HUD'),
    import('./game/combat/WeaponSystem'),
    import('./game/state/OxygenSystem'),
    import('./game/state/ExtractionSystem'),
    import('./game/state/HealthSystem'),
    import('./game/entities/Turret'),
  ]).then(
    ([
      missionZone,
      playerController,
      interactionSystem,
      hud,
      weaponSystem,
      oxygenSystem,
      extractionSystem,
      healthSystem,
      turret,
    ]) => ({
      buildMissionZone: missionZone.buildMissionZone,
      FirstPersonController: playerController.FirstPersonController,
      InteractionSystem: interactionSystem.InteractionSystem,
      HUD: hud.HUD,
      WeaponSystem: weaponSystem.WeaponSystem,
      OxygenSystem: oxygenSystem.OxygenSystem,
      ExtractionSystem: extractionSystem.ExtractionSystem,
      HealthSystem: healthSystem.HealthSystem,
      Turret: turret.Turret,
    })
  );
  return missionModulesPromise;
}

async function main() {
  const gameEngine = await GameEngine.create();
  const sceneManager = new SceneManager(gameEngine);

  let hud: HUD | null = null;
  let inventoryUI: InventoryUI | null = null;
  let missionBoardUI: MissionBoardUI | null = null;
  let debriefUI: DebriefUI | null = null;
  let perkMenuUI: PerkMenuUI | null = null;
  let decryptionUI: DecryptionUI | null = null;
  let shopUI: ShopUI | null = null;
  let mainMenuUI: MainMenuUI | null = null;
  let loadingUI: LoadingUI | null = null;
  let interactionSystem: InteractionSystem | null = null;

  gameState.load();

  gameStateStore.subscribe((state, prevState) => {
    if (state.missionStatus === 'success' && prevState.missionStatus !== 'success') {
      returnToHub();
      return;
    }

    if (state.missionStatus === 'failed' && prevState.missionStatus !== 'failed') {
      setTimeout(() => {
        gameState.update({
          missionStatus: transitionMission('failed', 'none'),
          activeMissionId: null,
        });
        returnToHub();
      }, 3000);
    }
  });

  async function initGlobalUI() {
    if (!inventoryUI) {
      const { InventoryUI } = await loadSharedUi();
      inventoryUI = new InventoryUI();
    }
  }

  sceneManager.register('hub', async (engine) => {
    await initGlobalUI();
    const modules = await loadHubModules();

    const scene = engine.createScene();
    const landmarks = await modules.buildHubScene(scene);

    gameState.update({ currentScene: 'hub' });
    gameState.save();

    const player: FirstPersonController = new modules.FirstPersonController(scene, engine.canvas, {
      position: new Vector3(0, 1.7, 0),
    });

    interactionSystem = new modules.InteractionSystem(scene, player);
    hud = new modules.HUD();
    interactionSystem.setOnTargetChange((target) => hud?.updateInteractionTarget(target));

    refreshHudStatus();

    const missionTerminalInteractable: Interactable = {
      mesh: landmarks.missionTerminal,
      promptText: 'Access Mission Board',
      onInteract: () => {
        if (missionBoardUI?.isVisible) return;
        openMissionBoard();
      },
    };
    interactionSystem.register(missionTerminalInteractable);

    const npcInteractable: Interactable = {
      mesh: landmarks.npcTerminal,
      promptText: 'Station Comms',
      onInteract: () => {
        const completed = gameState.get().completedMissions;
        if (completed.length > 0) {
          hud?.showMessage('COMMS: "Good work out there. Station records updated."', 4000);
        } else {
          hud?.showMessage('COMMS: "Check the mission board. We have work for you."', 4000);
        }
      },
    };
    interactionSystem.register(npcInteractable);

    const deployInteractable: Interactable = {
      mesh: landmarks.deployPoint,
      promptText: 'Deploy to Mission',
      onInteract: () => {
        const s = gameState.get();
        if (s.missionStatus === 'accepted' && s.activeMissionId) {
          gameState.update({
            missionStatus: transitionMission(s.missionStatus, 'deployed'),
          });
          deployToMission();
        } else {
          hud?.showMessage('No active mission. Visit the Mission Board first.', 3000);
        }
      },
    };
    interactionSystem.register(deployInteractable);

    const shopTerminalInteractable: Interactable = {
      mesh: landmarks.shopTerminal,
      promptText: 'Access Requisitions Shop',
      onInteract: () => {
        if (shopUI?.isOpen()) return;
        shopUI?.show();
      },
    };
    interactionSystem.register(shopTerminalInteractable);

    const perkTerminalInteractable: Interactable = {
      mesh: landmarks.perkTerminal,
      promptText: 'Access Neural Modulation Interface',
      onInteract: () => {
        perkMenuUI?.toggle();
      },
    };
    interactionSystem.register(perkTerminalInteractable);

    const decryptionTerminalInteractable: Interactable = {
      mesh: landmarks.decryptionTerminal,
      promptText: 'Access Neural Decryption Station',
      onInteract: () => {
        decryptionUI?.show();
      },
    };
    interactionSystem.register(decryptionTerminalInteractable);

    missionBoardUI = new modules.MissionBoardUI();
    shopUI = new modules.ShopUI();
    perkMenuUI = new modules.PerkMenuUI();
    decryptionUI = new modules.DecryptionUI();

    missionBoardUI.setActionHandler((action, missionId) => {
      if (action === 'close') {
        missionBoardUI?.hide();
        return;
      }

      if (action === 'accept' && missionId) {
        const mission = dataManager.getMission(missionId);
        if (!mission) return;
        gameState.update({
          activeMissionId: mission.id,
          missionStatus: transitionMission('none', 'accepted'),
        });
        refreshHudStatus();
        missionBoardUI?.hide();
        hud?.showMessage(`Mission accepted: ${mission.title}. Head to airlock.`, 4000);
      }
    });

    const hubState = gameState.get();
    if (hubState.missionStatus === 'success' && hubState.activeMissionId) {
      showDebrief(hubState.activeMissionId, modules.DebriefUI);
    }

    scene.onKeyboardObservable.add((info) => {
      if (
        info.type === KeyboardEventTypes.KEYDOWN &&
        info.event.key.toLowerCase() === 'p' &&
        gameState.get().currentScene === 'hub'
      ) {
        perkMenuUI?.toggle();
      }
    });

    gameState.save();
    loadMissionModules();

    return scene;
  });

  sceneManager.register('mission', async (engine) => {
    const modules = await loadMissionModules();
    const scene = engine.createScene();

    const player: FirstPersonController = new modules.FirstPersonController(scene, engine.canvas, {
      position: new Vector3(0, 1.7, 7.5),
    });

    interactionSystem = new modules.InteractionSystem(scene, player);
    hud = new modules.HUD();
    interactionSystem.setOnTargetChange((target) => hud?.updateInteractionTarget(target));

    const health: HealthSystem = new modules.HealthSystem({
      maxHealth: 100,
      onDamage: (current, max) => {
        hud?.updateHealth(current / max);
        hud?.showDamageFlash();
        hud?.showMessage('CRITICAL: Damage detected!', 2000);
      },
      onDeath: () => {
        hud?.showMessage('VITAL SIGNS LOST. EMERGENCY EXTRACTION FAILED.', 5000);
        gameState.update({ missionStatus: 'failed' });
      },
    });

    const activeMission = dataManager.getMission(gameState.get().activeMissionId ?? '');
    const landmarks = await modules.buildMissionZone(
      scene,
      interactionSystem,
      hud,
      player.camera as any,
      health,
      activeMission?.biome ?? 'industrial'
    );
    const weaponSystem: WeaponSystem = new modules.WeaponSystem(scene, player, hud);
    new modules.OxygenSystem(scene, hud);
    new modules.ExtractionSystem(scene, hud, landmarks.extractionPoint as Mesh, health);

    scene.onKeyboardObservable.add((info) => {
      if (info.type !== KeyboardEventTypes.KEYDOWN) return;
      if (info.event.key.toLowerCase() === 'f') weaponSystem.melee();
      if (info.event.key.toLowerCase() === 'g') weaponSystem.throwGrenade();
    });

    hud.updateHealth(1.0);

    const s = gameState.get();
    if (s.missionStatus === 'deployed') {
      gameState.update({
        missionStatus: transitionMission(s.missionStatus, 'objectiveActive'),
      });
    }

    refreshHudStatus();

    new modules.Turret(scene, new Vector3(-4, 0, -6), player.camera as Camera, health, hud);
    new modules.Turret(scene, new Vector3(4, 0, -6), player.camera as Camera, health, hud);

    hud.showMessage(
      `Objective: Locate and retrieve the ${activeMission?.objectiveName ?? 'objective'}.`,
      4000
    );

    const objectiveInteractable: Interactable = {
      mesh: landmarks.objectiveItemOrNode as Mesh,
      promptText: `Retrieve ${activeMission?.objectiveName ?? 'Objective'}`,
      onInteract: () => {
        const missionState = gameState.get().missionStatus;
        if (missionState === 'objectiveActive') {
          gameState.update({
            missionStatus: transitionMission(missionState, 'objectiveComplete'),
          });

          if (gameState.addXP(500)) hud?.showLevelUp();

          landmarks.objectiveItemOrNode.setEnabled(false);
          interactionSystem?.unregister(objectiveInteractable);
          refreshHudStatus();

          hud?.showMessage(
            `${activeMission?.objectiveName ?? 'Objective'} recovered. Head to the extraction point.`,
            4000
          );
        }
      },
    };
    interactionSystem.register(objectiveInteractable);

    scene.onBeforeRenderObservable.add(() => {
      const delta = scene.getEngine().getDeltaTime() * 0.001;
      health.update(delta);
      hud?.updateShield(health.getShieldPercent());

      const state = gameState.get();
      const targetXP = state.level * 1000;
      hud?.updateXP(state.xp / targetXP, state.level);
    });

    const extractionInteractable: Interactable = {
      mesh: landmarks.extractionPoint,
      promptText: 'Hold Extraction Zone',
      onInteract: () => {
        const missionState = gameState.get().missionStatus;
        if (missionState === 'objectiveComplete' || missionState === 'extractionAvailable') {
          hud?.showMessage('Stand in the extraction zone until uplink completes.', 3000);
        } else {
          hud?.showMessage('Retrieve the objective before extracting.', 3000);
        }
      },
    };
    interactionSystem.register(extractionInteractable);

    gameState.update({ currentScene: 'mission' });
    gameState.save();

    return scene;
  });

  async function deployToMission() {
    disposeUI();
    await sceneManager.switchTo('mission');
  }

  async function returnToHub() {
    disposeUI();
    await sceneManager.switchTo('hub');
  }

  function disposeUI() {
    hud?.dispose();
    hud = null;
    missionBoardUI?.dispose();
    missionBoardUI = null;
    debriefUI?.dispose();
    debriefUI = null;
    shopUI?.dispose();
    shopUI = null;
    perkMenuUI?.dispose();
    perkMenuUI = null;
    decryptionUI?.dispose();
    decryptionUI = null;
    interactionSystem?.clearAll();
    interactionSystem = null;
  }

  function getNextMission() {
    const s = gameState.get();
    return dataManager.getMissions().find((mission) => !s.completedMissions.includes(mission.id)) ?? null;
  }

  function openMissionBoard() {
    const s = gameState.get();
    const mission = getNextMission();

    if (!mission) {
      hud?.showMessage('No new missions available. Check back later.', 3000);
      return;
    }

    const canAccept = s.missionStatus === 'none';
    const canDeploy = s.missionStatus === 'accepted' && s.activeMissionId === mission.id;
    missionBoardUI?.show(mission, canAccept, canDeploy);
  }

  function refreshHudStatus() {
    const s = gameState.get();
    if (s.activeMissionId && s.missionStatus !== 'none' && s.missionStatus !== 'returnedToHub') {
      const mission = dataManager.getMission(s.activeMissionId);
      const label = statusLabel(s.missionStatus);
      hud?.setMissionStatus(mission?.title ?? s.activeMissionId, label);
    } else {
      hud?.setMissionStatus(null, null);
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'deployed':
        return 'Deployed';
      case 'objectiveActive':
        return 'Find Objective';
      case 'objectiveComplete':
        return 'Objective Secured';
      case 'extractionAvailable':
        return 'Hold Zone';
      case 'success':
        return 'Extracting...';
      default:
        return status;
    }
  }

  function showDebrief(
    missionId: string,
    DebriefUIClass?: typeof import('./ui/debrief/DebriefUI').DebriefUI
  ) {
    const mission = dataManager.getMission(missionId);
    if (!mission) return;

    const mountDebrief = (Ctor: typeof import('./ui/debrief/DebriefUI').DebriefUI) => {
      debriefUI = new Ctor();
      debriefUI.setContinueHandler(() => {
        const s = gameState.get();
        gameState.update({
          missionStatus: transitionMission(s.missionStatus, 'returnedToHub'),
          completedMissions: [...s.completedMissions, missionId],
        });
        gameState.update({
          missionStatus: transitionMission(gameState.get().missionStatus, 'none'),
          activeMissionId: null,
        });
        gameState.setFlag('firstMissionComplete', true);
        gameState.decaySaturations();
        gameState.save();
        refreshHudStatus();
        debriefUI?.hide();
      });
      debriefUI.show(mission);
    };

    if (DebriefUIClass) {
      mountDebrief(DebriefUIClass);
      return;
    }

    import('./ui/debrief/DebriefUI').then((module) => mountDebrief(module.DebriefUI));
  }

  const sharedUi = await loadSharedUi();
  mainMenuUI = new sharedUi.MainMenuUI();
  loadingUI = new sharedUi.LoadingUI();
  sceneManager.setLoadingUI(loadingUI);

  loadHubModules();

  mainMenuUI.show(async () => {
    const startScene = gameState.get().currentScene;
    await sceneManager.switchTo(startScene);
  });
}

main().catch(console.error);
