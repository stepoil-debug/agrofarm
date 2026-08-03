using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace AgroFarm.Editor
{
    [InitializeOnLoad]
    public static class AgroFarmProjectSetup
    {
        private const string SceneFolder = "Assets/AgroFarm/Scenes";
        private const string MainScene = SceneFolder + "/Main.unity";

        static AgroFarmProjectSetup()
        {
            EditorApplication.delayCall += EnsureProject;
        }

        [MenuItem("AgroFarm/Configurar projeto completo")]
        public static void EnsureProject()
        {
            EnsureScene();
            ConfigurePlayer();
            URPProjectConfigurator.EnsureAssigned();
        }

        private static void EnsureScene()
        {
            if (!AssetDatabase.IsValidFolder(SceneFolder))
            {
                if (!AssetDatabase.IsValidFolder("Assets/AgroFarm"))
                    AssetDatabase.CreateFolder("Assets", "AgroFarm");
                AssetDatabase.CreateFolder("Assets/AgroFarm", "Scenes");
            }

            if (!File.Exists(Path.GetFullPath(MainScene)))
            {
                UnityEngine.SceneManagement.Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, MainScene);
            }

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(MainScene, true) };
        }

        private static void ConfigurePlayer()
        {
            PlayerSettings.companyName = "STEP Oil & Gas";
            PlayerSettings.productName = "AgroFarm RPG";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.stepoil.agrofarm");
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.runInBackground = false;
            PlayerSettings.usePlayerLog = true;
            PlayerSettings.gcIncremental = true;
            SetActiveInputHandlingToBoth();
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;
            QualitySettings.vSyncCount = 0;
            AssetDatabase.SaveAssets();
        }

        private static void SetActiveInputHandlingToBoth()
        {
            Object[] assets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset");
            if (assets == null || assets.Length == 0)
                return;
            SerializedObject playerSettings = new(assets[0]);
            SerializedProperty activeInputHandler = playerSettings.FindProperty("activeInputHandler");
            if (activeInputHandler == null)
                return;
            activeInputHandler.intValue = 2;
            playerSettings.ApplyModifiedPropertiesWithoutUndo();
        }
    }
}
