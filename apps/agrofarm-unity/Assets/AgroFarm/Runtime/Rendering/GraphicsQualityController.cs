using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class GraphicsQualityController : MonoBehaviour
    {
        public enum DeviceProfile
        {
            Economy,
            Balanced,
            High
        }

        public DeviceProfile ActiveProfile { get; private set; }

        public void ApplyBestProfile()
        {
            int memory = SystemInfo.systemMemorySize;
            int graphicsMemory = SystemInfo.graphicsMemorySize;
            bool mobile = Application.isMobilePlatform;

            DeviceProfile profile;
            if (mobile && (memory < 5000 || graphicsMemory < 1500))
                profile = DeviceProfile.Economy;
            else if (mobile || memory < 9000 || graphicsMemory < 3500)
                profile = DeviceProfile.Balanced;
            else
                profile = DeviceProfile.High;

            Apply(profile);
        }

        public void Apply(DeviceProfile profile)
        {
            ActiveProfile = profile;
            UniversalRenderPipelineAsset urp = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;

            switch (profile)
            {
                case DeviceProfile.Economy:
                    Application.targetFrameRate = 30;
                    QualitySettings.shadowDistance = 28f;
                    QualitySettings.lodBias = 0.75f;
                    QualitySettings.anisotropicFiltering = AnisotropicFiltering.Disable;
                    ScalableBufferManager.ResizeBuffers(0.82f, 0.82f);
                    if (urp != null)
                    {
                        urp.renderScale = 0.82f;
                        urp.msaaSampleCount = 2;
                        urp.supportsCameraDepthTexture = false;
                        urp.supportsCameraOpaqueTexture = false;
                    }
                    break;

                case DeviceProfile.Balanced:
                    Application.targetFrameRate = 60;
                    QualitySettings.shadowDistance = 48f;
                    QualitySettings.lodBias = 1f;
                    QualitySettings.anisotropicFiltering = AnisotropicFiltering.Enable;
                    ScalableBufferManager.ResizeBuffers(0.92f, 0.92f);
                    if (urp != null)
                    {
                        urp.renderScale = 0.92f;
                        urp.msaaSampleCount = 2;
                        urp.supportsCameraDepthTexture = true;
                        urp.supportsCameraOpaqueTexture = false;
                    }
                    break;

                default:
                    Application.targetFrameRate = 60;
                    QualitySettings.shadowDistance = 72f;
                    QualitySettings.lodBias = 1.35f;
                    QualitySettings.anisotropicFiltering = AnisotropicFiltering.ForceEnable;
                    ScalableBufferManager.ResizeBuffers(1f, 1f);
                    if (urp != null)
                    {
                        urp.renderScale = 1f;
                        urp.msaaSampleCount = 4;
                        urp.supportsCameraDepthTexture = true;
                        urp.supportsCameraOpaqueTexture = true;
                    }
                    break;
            }
        }
    }
}
