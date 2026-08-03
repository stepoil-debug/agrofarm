using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace AgroFarm.Editor
{
    public static class URPProjectConfigurator
    {
        private const string SettingsFolder = "Assets/AgroFarm/Settings";
        private const string PipelinePath = SettingsFolder + "/AgroFarm_URP.asset";
        private const string RendererPath = SettingsFolder + "/AgroFarm_UniversalRenderer.asset";

        [MenuItem("AgroFarm/Rendering/Criar e aplicar URP")]
        public static UniversalRenderPipelineAsset CreateAndAssign()
        {
            EnsureFolder();

            UniversalRenderPipelineAsset pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null)
            {
                pipeline = ScriptableObject.CreateInstance<UniversalRenderPipelineAsset>();
                pipeline.name = "AgroFarm_URP";

                ScriptableRendererData renderer = pipeline.LoadBuiltinRendererData(RendererType.UniversalRenderer);
                if (renderer != null && string.IsNullOrEmpty(AssetDatabase.GetAssetPath(renderer)))
                {
                    renderer.name = "AgroFarm_UniversalRenderer";
                    AssetDatabase.CreateAsset(renderer, RendererPath);
                }

                AssetDatabase.CreateAsset(pipeline, PipelinePath);
            }

            ConfigurePipeline(pipeline);
            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline;
            EditorUtility.SetDirty(pipeline);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"AgroFarm URP aplicado: {PipelinePath}");
            return pipeline;
        }

        public static UniversalRenderPipelineAsset EnsureAssigned()
        {
            UniversalRenderPipelineAsset current = GraphicsSettings.defaultRenderPipeline as UniversalRenderPipelineAsset;
            return current != null ? current : CreateAndAssign();
        }

        private static void ConfigurePipeline(UniversalRenderPipelineAsset pipeline)
        {
            pipeline.renderScale = 1f;
            pipeline.msaaSampleCount = 4;
            pipeline.supportsHDR = true;
            pipeline.supportsCameraDepthTexture = true;
            pipeline.supportsCameraOpaqueTexture = false;
            pipeline.shadowDistance = 70f;
            pipeline.shadowCascadeCount = 2;
            pipeline.mainLightRenderingMode = LightRenderingMode.PerPixel;
            pipeline.additionalLightsRenderingMode = LightRenderingMode.PerPixel;
            pipeline.useSRPBatcher = true;
            pipeline.upscalingFilter = UpscalingFilterSelection.Auto;
        }

        private static void EnsureFolder()
        {
            if (!AssetDatabase.IsValidFolder("Assets/AgroFarm"))
                AssetDatabase.CreateFolder("Assets", "AgroFarm");
            if (!AssetDatabase.IsValidFolder(SettingsFolder))
                AssetDatabase.CreateFolder("Assets/AgroFarm", "Settings");
        }
    }
}
