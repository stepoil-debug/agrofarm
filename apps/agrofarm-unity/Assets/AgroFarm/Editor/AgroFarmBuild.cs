using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace AgroFarm.Editor
{
    public static class AgroFarmBuild
    {
        private static readonly string[] Scenes = { "Assets/AgroFarm/Scenes/Main.unity" };

        [MenuItem("AgroFarm/Build/WebGL")]
        public static void BuildWebGL()
        {
            AgroFarmProjectSetup.EnsureProject();
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../dist-unity/index.html"));
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "dist-unity");
            BuildPlayerOptions options = new()
            {
                scenes = Scenes,
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.CompressWithLz4HC
            };
            EnsureSuccess(BuildPipeline.BuildPlayer(options));
        }

        [MenuItem("AgroFarm/Build/Android APK de teste")]
        public static void BuildAndroidApk()
        {
            AgroFarmProjectSetup.EnsureProject();
            EditorUserBuildSettings.buildAppBundle = false;
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../Builds/Android/AgroFarm.apk"));
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/Android");
            BuildPlayerOptions options = new()
            {
                scenes = Scenes,
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.Development
            };
            EnsureSuccess(BuildPipeline.BuildPlayer(options));
        }

        [MenuItem("AgroFarm/Build/Google Play AAB")]
        public static void BuildGooglePlayAab()
        {
            AgroFarmProjectSetup.EnsureProject();
            ConfigureSigningFromEnvironment();
            EditorUserBuildSettings.buildAppBundle = true;
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../Builds/Android/AgroFarm.aab"));
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/Android");
            BuildPlayerOptions options = new()
            {
                scenes = Scenes,
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };
            EnsureSuccess(BuildPipeline.BuildPlayer(options));
        }

        private static void ConfigureSigningFromEnvironment()
        {
            string keystore = Environment.GetEnvironmentVariable("AGROFARM_KEYSTORE_PATH");
            string keystorePassword = Environment.GetEnvironmentVariable("AGROFARM_KEYSTORE_PASSWORD");
            string alias = Environment.GetEnvironmentVariable("AGROFARM_KEY_ALIAS");
            string aliasPassword = Environment.GetEnvironmentVariable("AGROFARM_KEY_ALIAS_PASSWORD");

            if (string.IsNullOrWhiteSpace(keystore) || string.IsNullOrWhiteSpace(alias))
                throw new InvalidOperationException("Defina AGROFARM_KEYSTORE_PATH e AGROFARM_KEY_ALIAS para gerar o AAB assinado.");

            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystore;
            PlayerSettings.Android.keystorePass = keystorePassword;
            PlayerSettings.Android.keyaliasName = alias;
            PlayerSettings.Android.keyaliasPass = aliasPassword;
        }

        private static void EnsureSuccess(BuildReport report)
        {
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException($"Build falhou: {report.summary.result}. Erros: {report.summary.totalErrors}");
            Debug.Log($"Build concluído: {report.summary.outputPath} ({report.summary.totalSize} bytes)");
        }
    }
}
