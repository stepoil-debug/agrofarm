using UnityEngine;

namespace AgroFarm
{
    [CreateAssetMenu(menuName = "AgroFarm/PBR Surface Set", fileName = "PBRSurface")]
    public sealed class PBRSurfaceSet : ScriptableObject
    {
        public Color baseColor = Color.white;
        public Texture2D albedo;
        public Texture2D normal;
        public Texture2D metallic;
        public Texture2D roughness;
        public Texture2D ambientOcclusion;
        public Texture2D height;
        [Range(0f, 1f)] public float metallicScalar;
        [Range(0f, 1f)] public float roughnessScalar = 0.7f;
        [Range(0f, 2f)] public float normalStrength = 1f;
        [Range(0f, 1f)] public float occlusionStrength = 1f;
        public Vector2 tiling = Vector2.one;

        public Material CreateMaterial()
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            Material material = new(shader)
            {
                name = $"PBR_{name}",
                enableInstancing = true
            };

            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", baseColor);
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", albedo);
            if (material.HasProperty("_BaseMap")) material.SetTextureScale("_BaseMap", tiling);
            if (material.HasProperty("_BumpMap")) material.SetTexture("_BumpMap", normal);
            if (material.HasProperty("_BumpScale")) material.SetFloat("_BumpScale", normalStrength);
            if (material.HasProperty("_MetallicGlossMap")) material.SetTexture("_MetallicGlossMap", metallic);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallicScalar);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 1f - roughnessScalar);
            if (material.HasProperty("_OcclusionMap")) material.SetTexture("_OcclusionMap", ambientOcclusion);
            if (material.HasProperty("_OcclusionStrength")) material.SetFloat("_OcclusionStrength", occlusionStrength);
            if (material.HasProperty("_ParallaxMap")) material.SetTexture("_ParallaxMap", height);

            if (normal != null) material.EnableKeyword("_NORMALMAP");
            if (metallic != null) material.EnableKeyword("_METALLICSPECGLOSSMAP");
            if (ambientOcclusion != null) material.EnableKeyword("_OCCLUSIONMAP");
            if (height != null) material.EnableKeyword("_PARALLAXMAP");
            return material;
        }
    }
}
