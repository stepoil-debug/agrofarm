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
            ValidateRenderPipeline();
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
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.stepoil.agrofarm");
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.runInBackground = false;
            PlayerSettings.usePlayerLog = true;
            PlayerSettings.gcIncremental = true;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;
            QualitySettings.vSyncCount = 0;
            AssetDatabase.SaveAssets();
        }

        private static void ValidateRenderPipeline()
        {
            if (GraphicsSettings.defaultRenderPipeline == null)
            {
                Debug.LogWarning(
                    "AgroFarm: crie um URP Asset em Assets > Create > Rendering > URP Asset (with Universal Renderer) " +
                    "e associe em Project Settings > Graphics. O jogo ainda abre com o pipeline Built-in, mas o visual final exige URP.");
            }
        }
    }
}
