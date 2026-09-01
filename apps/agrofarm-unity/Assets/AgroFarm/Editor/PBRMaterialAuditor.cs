using System.Text;
using UnityEditor;
using UnityEngine;

namespace AgroFarm.Editor
{
    public static class PBRMaterialAuditor
    {
        [MenuItem("AgroFarm/Auditar materiais PBR")]
        public static void AuditAllMaterials()
        {
            string[] guids = AssetDatabase.FindAssets("t:Material");
            int warnings = 0;
            StringBuilder report = new();

            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (material == null)
                    continue;

                bool urpLit = material.shader != null && material.shader.name.Contains("Universal Render Pipeline/Lit");
                if (!urpLit)
                {
                    report.AppendLine($"[Shader] {path}: use URP/Lit.");
                    warnings++;
                    continue;
                }

                if (material.HasProperty("_BaseMap") && material.GetTexture("_BaseMap") == null)
                {
                    report.AppendLine($"[Albedo] {path}: Base Map ausente.");
                    warnings++;
                }

                if (material.HasProperty("_BumpMap") && material.GetTexture("_BumpMap") == null)
                {
                    report.AppendLine($"[Normal] {path}: Normal Map ausente.");
                    warnings++;
                }

                if (material.HasProperty("_MetallicGlossMap") && material.GetTexture("_MetallicGlossMap") == null)
                {
                    float metallic = material.HasProperty("_Metallic") ? material.GetFloat("_Metallic") : 0f;
                    if (metallic > 0.05f && metallic < 0.95f)
                    {
                        report.AppendLine($"[Metallic] {path}: valor intermediário sem mapa; verifique se é fisicamente correto.");
                        warnings++;
                    }
                }

                if (material.HasProperty("_OcclusionMap") && material.GetTexture("_OcclusionMap") == null)
                {
                    report.AppendLine($"[AO] {path}: AO ausente; aceitável apenas para materiais muito simples.");
                    warnings++;
                }

                if (material.HasProperty("_Smoothness"))
                {
                    float smoothness = material.GetFloat("_Smoothness");
                    if (smoothness > 0.8f && material.HasProperty("_Metallic") && material.GetFloat("_Metallic") < 0.1f)
                    {
                        report.AppendLine($"[Plástico] {path}: não metálico com smoothness {smoothness:0.00}; revise roughness.");
                        warnings++;
                    }
                }
            }

            if (warnings == 0)
                Debug.Log("Auditoria PBR concluída sem alertas.");
            else
                Debug.LogWarning($"Auditoria PBR encontrou {warnings} pontos:\n{report}");
        }
    }
}
