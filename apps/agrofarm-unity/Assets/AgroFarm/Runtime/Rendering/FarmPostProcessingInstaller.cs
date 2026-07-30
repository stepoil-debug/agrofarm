using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace AgroFarm
{
    public static class FarmPostProcessingInstaller
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Install()
        {
            if (GraphicsSettings.currentRenderPipeline is not UniversalRenderPipelineAsset)
                return;
            if (Object.FindFirstObjectByType<FarmPostProcessing>() != null)
                return;
            GameObject root = new("AgroFarmPostProcessing");
            Object.DontDestroyOnLoad(root);
            root.AddComponent<FarmPostProcessing>().BuildProfile();
        }
    }
}
