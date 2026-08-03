using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmPostProcessing : MonoBehaviour
    {
        private Volume volume;
        private VolumeProfile profile;

        public void BuildProfile()
        {
            volume = gameObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 10f;
            profile = ScriptableObject.CreateInstance<VolumeProfile>();
            profile.name = "AgroFarmRuntimeVolume";
            volume.profile = profile;

            Tonemapping tone = profile.Add<Tonemapping>(true);
            tone.mode.Override(TonemappingMode.ACES);

            ColorAdjustments color = profile.Add<ColorAdjustments>(true);
            color.postExposure.Override(0f);
            color.contrast.Override(7f);
            color.saturation.Override(3f);
            color.colorFilter.Override(new Color(1f, 0.98f, 0.94f));

            Bloom bloom = profile.Add<Bloom>(true);
            bloom.intensity.Override(Application.isMobilePlatform ? 0.08f : 0.14f);
            bloom.threshold.Override(1.05f);
            bloom.scatter.Override(0.55f);

            Vignette vignette = profile.Add<Vignette>(true);
            vignette.intensity.Override(0.10f);
            vignette.smoothness.Override(0.35f);

            WhiteBalance whiteBalance = profile.Add<WhiteBalance>(true);
            whiteBalance.temperature.Override(2f);
            whiteBalance.tint.Override(0f);

            if (!Application.isMobilePlatform)
            {
                MotionBlur blur = profile.Add<MotionBlur>(true);
                blur.intensity.Override(0.12f);
                blur.clamp.Override(0.03f);
            }
        }

        private void OnDestroy()
        {
            if (profile != null)
                Destroy(profile);
        }
    }
}
