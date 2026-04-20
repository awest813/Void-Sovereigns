import './index.css';
import { Vector3 } from '@babylonjs/core';
import { GameEngine } from './engine/GameEngine';
import { SceneManager } from './engine/scene/SceneManager';
import { FirstPersonController } from './engine/player/FirstPersonController';
import { InteractionSystem } from './game/InteractionSystem';
import { HUD } from './ui/hud/HUD';
import { MissionBoardUI } from './ui/missionBoard/MissionBoardUI';
import { DebriefUI } from './ui/debrief/DebriefUI';
import { ShopUI } from './ui/shop/ShopUI';
import { PerkMenuUI } from './ui/perks/PerkMenuUI';
import { DecryptionUI } from './ui/DecryptionUI';
import { buildHubScene } from './game/hub/HubScene';
import { buildMissionZone } from './game/missions/MissionZone';
import { MainMenuUI } from './ui/menu/MainMenuUI';
import { LoadingUI } from './ui/LoadingUI';
import { gameState, gameStateStore } from './game/state/GameState';
import { OxygenSystem } from './game/state/OxygenSystem';
import { ExtractionSystem } from './game/state/ExtractionSystem';
import { InventoryUI } from './ui/inventory/InventoryUI';
import { transitionMission } from './game/state/MissionState';
import { dataManager } from './game/state/DataManager';
import { WeaponSystem } from './game/combat/WeaponSystem';
import { HealthSystem } from './game/state/HealthSystem';
import { Turret } from './game/entities/Turret';
import type { Interactable } from './game/interactions/Interactable';

async function main() {
  const gameEngine = await GameEngine.create();
  const sceneManager = new SceneManager(gameEngine);

  // Shared UI references (recreated per scene)
  let hud: HUD | null = null;
let inventoryUI: InventoryUI | null = null;
  let missionBoardUI: MissionBoardUI | null = null;
  let debriefUI: DebriefUI | null = null;
  let perkMenuUI: PerkMenuUI | null = null;
  let decryptionUI: DecryptionUI | null = null;
  let mainMenuUI: MainMenuUI | null = null;
  let loadingUI: LoadingUI | null = null;
  let interactionSystem: InteractionSystem | null = null;

  // Try to load saved state
  gameState.load();

  // State change observer for transitions
  gameStateStore.subscribe((state, prevState) => {
    if (state.missionStatus === 'success' && prevState.missionStatus !== 'success') {
      returnToHub();
    }
  });

  // =====================
  // HUB SCENE BUILDER
  // =====================
  function initGlobalUI() {
    if (!inventoryUI) inventoryUI = new InventoryUI();
  }

  sceneManager.register('hub', async (engine) => {
    initGlobalUI();
    const scene = engine.createScene();
    const landmarks = await buildHubScene(scene);

    gameState.update({ currentScene: 'hub', version: '0.4.1' });
    gameState.save();

    const player = new FirstPersonController(scene, engine.canvas, {
      position: new Vector3(0, 1.7, 0),
    });

    interactionSystem = new InteractionSystem(scene, player);
    hud = new HUD();
    interactionSystem.setOnTargetChange((target) => hud?.updateInteractionTarget(target));

    const state = gameState.get();

    // Sync mission status indicator
    refreshHudStatus();

    // --- Mission Terminal ---
    const missionTerminalInteractable: Interactable = {
      mesh: landmarks.missionTerminal,
      promptText: 'Access Mission Board',
      onInteract: () => {
        if (missionBoardUI?.isVisible()) return;
        openMissionBoard();
      },
    };
    interactionSystem.register(missionTerminalInteractable);

    // --- NPC Terminal ---
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

    // --- Deploy Point ---
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

    // --- Shop Terminal ---
    const shopTerminalInteractable: Interactable = {
      mesh: landmarks.shopTerminal,
      promptText: 'Access Requisitions Shop',
      onInteract: () => {
        if (shopUI?.isOpen()) return;
        shopUI?.show();
      },
    };
    interactionSystem.register(shopTerminalInteractable);

    // --- Perk Terminal ---
    const perkTerminalInteractable: Interactable = {
      mesh: landmarks.perkTerminal,
      promptText: 'Access Neural Modulation Interface',
      onInteract: () => {
        perkMenuUI?.toggle();
      },
    };
    interactionSystem.register(perkTerminalInteractable);

    // --- Decryption Terminal ---
    const decryptionTerminalInteractable: Interactable = {
      mesh: landmarks.decryptionTerminal,
      promptText: 'Access Neural Decryption Station',
      onInteract: () => {
        decryptionUI?.show();
      },
    };
    interactionSystem.register(decryptionTerminalInteractable);

    // --- Mission Board UI ---
     missionBoardUI = new MissionBoardUI();
    shopUI = new ShopUI();
    perkMenuUI = new PerkMenuUI();
    decryptionUI = new DecryptionUI();
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
        return;
      }
    });

    // --- Debrief UI (shown on return) ---
    if (state.missionStatus === 'success' && state.activeMissionId) {
      showDebrief(state.activeMissionId);
    }

    // Save state on return
    gameState.update({ currentScene: 'hub' });
    // Global Hub Keys
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'p') {
        if (gameState.get().currentScene === 'hub') {
          perkMenuUI?.toggle();
        }
      }
    });

    gameState.save();

    return scene;
  });

  // =====================
  // MISSION SCENE BUILDER
  // =====================
  sceneManager.register('mission', async (engine) => {
    const scene = engine.createScene();
    
    const player = new FirstPersonController(scene, engine.canvas, {
      position: new Vector3(0, 1.7, 7.5),
    });

    interactionSystem = new InteractionSystem(scene, player);
    hud = new HUD();
    interactionSystem.setOnTargetChange((target) => hud?.updateInteractionTarget(target));
    const health = new HealthSystem({
      maxHealth: 100,
      onDamage: (current, max) => {
        hud?.updateHealth(current / max);
        hud?.showDamageFlash();
        hud?.showMessage('CRITICAL: Damage detected!', 2000);
      },
      onDeath: () => {
        hud?.showMessage('VITAL SIGNS LOST. EMERGENCY EXTRACTION FAILED.', 5000);
        setTimeout(() => {
          // Reset mission status and return
          gameState.update({
            missionStatus: transitionMission('none', 'none'),
            activeMissionId: null,
          });
          returnToHub();
        }, 3000);
      }
    });

    const activeMission = dataManager.getMission(gameState.get().activeMissionId ?? '');
    const landmarks = await buildMissionZone(scene, interactionSystem!, hud!, player.camera, health, activeMission?.biome ?? 'industrial');
    const weaponSystem = new WeaponSystem(scene, player);
    new OxygenSystem(scene, hud!);
    new ExtractionSystem(scene, hud!, landmarks.extractionPoint, health);

    // Tactical Key Listeners
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'f') weaponSystem.melee();
      if (e.key.toLowerCase() === 'g') weaponSystem.throwGrenade();
    });
    // Initial HUD sync
    hud.updateHealth(1.0);

    // Transition to objectiveActive
    const s = gameState.get();
    if (s.missionStatus === 'deployed') {
      gameState.update({
        missionStatus: transitionMission(s.missionStatus, 'objectiveActive'),
      });
    }

    // Sync mission status indicator
    refreshHudStatus();

     // Spawn Turrets
    new Turret(scene, new Vector3(-4, 0, -6), player.camera, health, hud!);
    new Turret(scene, new Vector3(4, 0, -6), player.camera, health, hud!);

    const activeMission = dataManager.getMission(gameState.get().activeMissionId ?? '');
    hud.showMessage(
      `Objective: Locate and retrieve the ${activeMission?.objectiveName ?? 'objective'}.`,
      4000
    );

    // --- Objective Item ---
    const objectiveInteractable: Interactable = {
      mesh: landmarks.objectiveItem,
      promptText: `Retrieve ${activeMission?.objectiveName ?? 'Objective'}`,
      onInteract: () => {
        const ms = gameState.get().missionStatus;
        if (ms === 'objectiveActive') {
          gameState.update({
            missionStatus: transitionMission(ms, 'objectiveComplete'),
          });
          
          if (gameState.addXP(500)) hud?.showLevelUp();
          
          // Hide the objective item
          landmarks.objectiveItem.setEnabled(false);
          interactionSystem?.unregister(objectiveInteractable);

          // Transition to extractionAvailable
          const ms2 = gameState.get().missionStatus;
          gameState.update({
            missionStatus: transitionMission(ms2, 'extractionAvailable'),
          });
          refreshHudStatus();

          hud?.showMessage(
            `${activeMission?.objectiveName ?? 'Objective'} recovered. Head to the extraction point.`,
            4000
          );
        }
      },
    };
    interactionSystem.register(objectiveInteractable);

    // Halo-style shield and RPG XP updates
    scene.onBeforeRenderObservable.add(() => {
      const delta = scene.getEngine().getDeltaTime() * 0.001;
      health.update(delta);
      hud?.updateShield(health.getShieldPercent());
      
      const s = gameState.get();
      const currentXP = s.xp;
      const targetXP = s.level * 1000;
      hud?.updateXP(currentXP / targetXP, s.level);
    });

    // --- Extraction Point ---
    const extractionInteractable: Interactable = {
      mesh: landmarks.extractionPoint,
      promptText: 'Extract',
      onInteract: () => {
        const ms = gameState.get().missionStatus;
        if (ms === 'extractionAvailable') {
          gameState.update({
            missionStatus: transitionMission(ms, 'success'),
          });
          gameState.save();
          returnToHub();
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

  // =====================
  // SCENE TRANSITIONS
  // =====================
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
    interactionSystem?.clearAll();
    interactionSystem = null;
  }

  // =====================
  // MISSION BOARD OPEN
  // =====================
  function getNextMission() {
    const s = gameState.get();
    return dataManager.getMissions().find(m => !s.completedMissions.includes(m.id)) ?? null;
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
      case 'accepted': return 'Accepted';
      case 'deployed': return 'Deployed';
      case 'objectiveActive': return 'Find Objective';
      case 'objectiveComplete': return 'Objective Secured';
      case 'extractionAvailable': return 'Extract Now';
      case 'success': return 'Extracting…';
      default: return status;
    }
  }

  // =====================
  // DEBRIEF
  // =====================
  function showDebrief(missionId: string) {
    const mission = dataManager.getMission(missionId);
    if (!mission) return;

    debriefUI = new DebriefUI();
    debriefUI.setContinueHandler(() => {
      // Complete the mission
      const s = gameState.get();
      gameState.update({
        missionStatus: transitionMission(s.missionStatus, 'returnedToHub'),
        completedMissions: [...s.completedMissions, missionId],
      });
      // Reset for next mission cycle
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
  }

  // =====================
  // BOOT SEQUENCE
  // =====================
  mainMenuUI = new MainMenuUI();
  loadingUI = new LoadingUI();
  sceneManager.setLoadingUI(loadingUI);
  
  // Show Main Menu first
  mainMenuUI.show(async () => {
    const startScene = gameState.get().currentScene;
    await sceneManager.switchTo(startScene);
  });
}

main().catch(console.error);
