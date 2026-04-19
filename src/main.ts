import './index.css';
import { Vector3 } from '@babylonjs/core';
import { GameEngine } from './engine/GameEngine';
import { SceneManager } from './engine/scene/SceneManager';
import { FirstPersonController } from './engine/player/FirstPersonController';
import { InteractionSystem } from './game/InteractionSystem';
import { HUD } from './ui/hud/HUD';
import { MissionBoardUI } from './ui/missionBoard/MissionBoardUI';
import { DebriefUI } from './ui/debrief/DebriefUI';
import { buildHubScene } from './game/hub/HubScene';
import { buildMissionZone } from './game/missions/MissionZone';
import { gameState } from './game/state/GameState';
import { transitionMission } from './game/state/MissionState';
import { MISSIONS, getMission } from './content/missions/missionData';
import type { Interactable } from './game/interactions/Interactable';

async function main() {
  const gameEngine = await GameEngine.create();
  const sceneManager = new SceneManager(gameEngine);

  // Shared UI references (recreated per scene)
  let hud: HUD | null = null;
  let missionBoardUI: MissionBoardUI | null = null;
  let debriefUI: DebriefUI | null = null;
  let interactionSystem: InteractionSystem | null = null;

  // Try to load saved state
  gameState.load();

  // =====================
  // HUB SCENE BUILDER
  // =====================
  sceneManager.register('hub', async (engine) => {
    const scene = engine.createScene();
    const landmarks = buildHubScene(scene);

    const player = new FirstPersonController(scene, engine.canvas, {
      position: new Vector3(0, 1.7, 0),
    });

    interactionSystem = new InteractionSystem(scene, player);
    hud = new HUD();
    interactionSystem.setOnTargetChange((target) => hud?.updateInteractionTarget(target));

    const state = gameState.get();

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

    // --- Mission Board UI ---
    missionBoardUI = new MissionBoardUI();
    missionBoardUI.setActionHandler((action) => {
      if (action === 'close') {
        missionBoardUI?.hide();
        return;
      }
      if (action === 'accept') {
        const mission = MISSIONS[0];
        gameState.update({
          activeMissionId: mission.id,
          missionStatus: transitionMission('none', 'accepted'),
        });
        missionBoardUI?.hide();
        hud?.showMessage(`Mission accepted: ${mission.title}. Head to the airlock to deploy.`, 4000);
        return;
      }
      if (action === 'deploy') {
        const s = gameState.get();
        if (s.missionStatus === 'accepted' && s.activeMissionId) {
          missionBoardUI?.hide();
          gameState.update({
            missionStatus: transitionMission(s.missionStatus, 'deployed'),
          });
          deployToMission();
        }
      }
    });

    // --- Debrief UI (shown on return) ---
    if (state.missionStatus === 'success' && state.activeMissionId) {
      showDebrief(state.activeMissionId);
    }

    // Save state on return
    gameState.update({ currentScene: 'hub' });
    gameState.save();

    return scene;
  });

  // =====================
  // MISSION SCENE BUILDER
  // =====================
  sceneManager.register('mission', async (engine) => {
    const scene = engine.createScene();
    const landmarks = buildMissionZone(scene);

    const player = new FirstPersonController(scene, engine.canvas, {
      position: new Vector3(0, 1.7, 7.5),
    });

    interactionSystem = new InteractionSystem(scene, player);
    hud = new HUD();
    interactionSystem.setOnTargetChange((target) => hud?.updateInteractionTarget(target));

    // Transition to objectiveActive
    const s = gameState.get();
    if (s.missionStatus === 'deployed') {
      gameState.update({
        missionStatus: transitionMission(s.missionStatus, 'objectiveActive'),
      });
    }

    hud.showMessage('Objective: Locate and retrieve the Data Core.', 4000);

    // --- Objective Item ---
    const objectiveInteractable: Interactable = {
      mesh: landmarks.objectiveItem,
      promptText: 'Retrieve Data Core',
      onInteract: () => {
        const ms = gameState.get().missionStatus;
        if (ms === 'objectiveActive') {
          gameState.update({
            missionStatus: transitionMission(ms, 'objectiveComplete'),
          });
          // Hide the objective item
          landmarks.objectiveItem.setEnabled(false);
          interactionSystem?.unregister(objectiveInteractable);

          // Transition to extractionAvailable
          const ms2 = gameState.get().missionStatus;
          gameState.update({
            missionStatus: transitionMission(ms2, 'extractionAvailable'),
          });

          hud?.showMessage('Data Core recovered. Head to the extraction point.', 4000);
        }
      },
    };
    interactionSystem.register(objectiveInteractable);

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
    interactionSystem?.clearAll();
    interactionSystem = null;
  }

  // =====================
  // MISSION BOARD OPEN
  // =====================
  function openMissionBoard() {
    const s = gameState.get();
    const mission = MISSIONS[0];
    const alreadyCompleted = s.completedMissions.includes(mission.id);

    if (alreadyCompleted) {
      hud?.showMessage('No new missions available. Check back later.', 3000);
      return;
    }

    const canAccept = s.missionStatus === 'none';
    const canDeploy = s.missionStatus === 'accepted' && s.activeMissionId === mission.id;
    missionBoardUI?.show(mission, canAccept, canDeploy);
  }

  // =====================
  // DEBRIEF
  // =====================
  function showDebrief(missionId: string) {
    const mission = getMission(missionId);
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
      gameState.save();
      debriefUI?.hide();
    });
    debriefUI.show(mission);
  }

  // =====================
  // BOOT
  // =====================
  const startScene = gameState.get().currentScene;
  await sceneManager.switchTo(startScene);
}

main().catch(console.error);
