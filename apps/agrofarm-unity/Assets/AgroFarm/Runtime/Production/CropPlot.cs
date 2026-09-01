using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class CropPlot : MonoBehaviour, IFarmInteractable
    {
        [SerializeField] private string persistentId;
        [SerializeField] private CropState state = CropState.Empty;
        [SerializeField] private CropKind crop = CropKind.Corn;
        [SerializeField] private bool watered;
        [SerializeField] private bool protectedCrop;
        [SerializeField] private double readyAtUnix;

        private readonly List<GameObject> cropVisuals = new();
        private TextMesh timerLabel;
        private float nextVisualUpdate;
        private Renderer soilRenderer;
        private Material soilMaterial;

        public string PersistentId => persistentId;
        public CropState State => state;
        public Transform InteractionTransform => transform;

        public void Configure(string id)
        {
            persistentId = id;
            RestoreFromSave();
            RebuildVisuals();
        }

        private void Awake()
        {
            if (string.IsNullOrWhiteSpace(persistentId))
                persistentId = $"plot-{Guid.NewGuid():N}";
            EnsureVisualReferences();
        }

        private void Update()
        {
            if (Time.unscaledTime < nextVisualUpdate)
                return;
            nextVisualUpdate = Time.unscaledTime + 0.25f;

            if (state == CropState.Growing && RemainingSeconds <= 0d)
            {
                ResolveMaturity();
                SaveState();
            }

            UpdateTimer();
            UpdateGrowthScale();
        }

        private double RemainingSeconds => Math.Max(0d, readyAtUnix - DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        public Vector3 GetApproachPoint(Vector3 actorPosition)
        {
            Vector3 delta = actorPosition - transform.position;
            delta.y = 0f;
            if (delta.sqrMagnitude < 0.01f)
                delta = Vector3.back;
            return transform.position + delta.normalized * 1.8f;
        }

        public void Interact(FarmSession session)
        {
            if (session == null)
                return;

            switch (session.SelectedTool)
            {
                case FarmTool.Hoe:
                    Prepare();
                    break;
                case FarmTool.Seed:
                    Plant(session.SelectedCrop);
                    break;
                case FarmTool.Water:
                    Water();
                    break;
                case FarmTool.Protect:
                    Protect();
                    break;
                case FarmTool.Harvest:
                    Harvest();
                    break;
                default:
                    FarmHUD.Instance?.ShowMessage("Selecione uma ferramenta agrícola.");
                    break;
            }
        }

        private void Prepare()
        {
            if (state != CropState.Empty)
            {
                FarmHUD.Instance?.ShowMessage("Este canteiro já está em uso.");
                return;
            }
            state = CropState.Prepared;
            watered = false;
            protectedCrop = false;
            RebuildVisuals();
            SaveState();
            FarmHUD.Instance?.ShowMessage("Solo preparado.");
        }

        private void Plant(CropKind selected)
        {
            if (state != CropState.Prepared)
            {
                FarmHUD.Instance?.ShowMessage("Prepare o solo antes de plantar.");
                return;
            }

            FarmSession session = FarmSession.Instance;
            CropBalance data = session.Balance.Crop(selected);
            if (!session.TrySpend(data.seedCost))
            {
                FarmHUD.Instance?.ShowMessage($"Sementes de {data.displayName} custam {data.seedCost:0} moedas.");
                return;
            }

            crop = selected;
            state = CropState.Growing;
            watered = false;
            protectedCrop = false;
            readyAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + data.GetDuration(session.Mode);
            RebuildVisuals();
            SaveState();
            FarmHUD.Instance?.ShowMessage($"{data.displayName} plantado.");
        }

        private void Water()
        {
            if (state != CropState.Growing)
            {
                FarmHUD.Instance?.ShowMessage("Não há plantação crescendo aqui.");
                return;
            }
            watered = true;
            SaveState();
            FarmHUD.Instance?.ShowMessage("Plantação irrigada.");
        }

        private void Protect()
        {
            if (state != CropState.Growing)
            {
                FarmHUD.Instance?.ShowMessage("Não há plantação crescendo aqui.");
                return;
            }
            FarmSession session = FarmSession.Instance;
            if (!session.TrySpend(2f))
            {
                FarmHUD.Instance?.ShowMessage("O defensivo custa 2 moedas.");
                return;
            }
            protectedCrop = true;
            SaveState();
            FarmHUD.Instance?.ShowMessage("Defensivo aplicado.");
        }

        private void ResolveMaturity()
        {
            FarmSession session = FarmSession.Instance;
            if (session != null && session.Mode == GameMode.Realistic)
            {
                float lossChance = 0f;
                if (!watered) lossChance += 0.35f;
                if (!protectedCrop) lossChance += 0.30f;
                if (UnityEngine.Random.value < lossChance)
                {
                    state = CropState.Lost;
                    RebuildVisuals();
                    return;
                }
            }
            state = CropState.Ready;
            RebuildVisuals();
        }

        private void Harvest()
        {
            if (state == CropState.Lost)
            {
                ResetPlot();
                FarmHUD.Instance?.ShowMessage("Plantação perdida removida.");
                return;
            }

            if (state != CropState.Ready)
            {
                FarmHUD.Instance?.ShowMessage("A colheita ainda não está pronta.");
                return;
            }

            FarmSession session = FarmSession.Instance;
            string inventoryKey = crop.ToString().ToLowerInvariant();
            int yield = session.Mode == GameMode.Free ? 3 : 1;
            if (!session.TryAddInventory(inventoryKey, yield))
            {
                FarmHUD.Instance?.ShowMessage("Galpão cheio. Venda ou amplie o armazenamento.");
                return;
            }

            ResetPlot();
            FarmHUD.Instance?.ShowMessage($"Colheita armazenada: +{yield}.");
        }

        private void ResetPlot()
        {
            state = CropState.Empty;
            watered = false;
            protectedCrop = false;
            readyAtUnix = 0d;
            RebuildVisuals();
            SaveState();
        }

        private void EnsureVisualReferences()
        {
            soilRenderer = GetComponentInChildren<Renderer>();
            if (soilRenderer != null)
            {
                soilMaterial = new Material(soilRenderer.sharedMaterial);
                soilRenderer.material = soilMaterial;
            }

            GameObject timer = new("CropTimer");
            timer.transform.SetParent(transform, false);
            timer.transform.localPosition = new Vector3(0f, 1.15f, 0f);
            timerLabel = timer.AddComponent<TextMesh>();
            timerLabel.anchor = TextAnchor.MiddleCenter;
            timerLabel.alignment = TextAlignment.Center;
            timerLabel.fontSize = 42;
            timerLabel.characterSize = 0.055f;
            timerLabel.color = new Color(1f, 0.96f, 0.72f);
            timerLabel.fontStyle = FontStyle.Bold;
        }

        private void UpdateTimer()
        {
            if (timerLabel == null)
                return;

            if (Camera.main != null)
                timerLabel.transform.rotation = Quaternion.LookRotation(timerLabel.transform.position - Camera.main.transform.position);

            double remaining = RemainingSeconds;
            bool show = state == CropState.Ready || state == CropState.Lost || (state == CropState.Growing && remaining <= 15d);
            timerLabel.gameObject.SetActive(show);
            if (!show)
                return;

            timerLabel.text = state switch
            {
                CropState.Ready => "PRONTO",
                CropState.Lost => "PERDIDA",
                _ => FormatDuration(remaining)
            };
        }

        private static string FormatDuration(double totalSeconds)
        {
            int seconds = Mathf.Max(0, Mathf.CeilToInt((float)totalSeconds));
            if (seconds < 60)
                return $"{seconds}s";
            int minutes = seconds / 60;
            int remainder = seconds % 60;
            if (minutes < 60)
                return $"{minutes}:{remainder:00}";
            int hours = minutes / 60;
            return $"{hours}h {minutes % 60:00}m";
        }

        private void RebuildVisuals()
        {
            EnsureVisualReferencesIfNeeded();
            foreach (GameObject visual in cropVisuals)
                if (visual != null) Destroy(visual);
            cropVisuals.Clear();

            if (soilMaterial != null)
            {
                soilMaterial.color = state == CropState.Empty
                    ? new Color(0.34f, 0.23f, 0.13f)
                    : new Color(0.24f, 0.13f, 0.07f);
            }

            if (state is CropState.Growing or CropState.Ready or CropState.Lost)
            {
                for (int row = 0; row < 3; row++)
                {
                    for (int column = 0; column < 4; column++)
                    {
                        GameObject plant = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                        plant.name = $"{crop}_Plant";
                        plant.transform.SetParent(transform, false);
                        plant.transform.localPosition = new Vector3((column - 1.5f) * 0.55f, 0.22f, (row - 1f) * 0.58f);
                        plant.transform.localScale = new Vector3(0.16f, 0.38f, 0.16f);
                        Collider collider = plant.GetComponent<Collider>();
                        if (collider != null) Destroy(collider);
                        Renderer renderer = plant.GetComponent<Renderer>();
                        renderer.material = new Material(renderer.sharedMaterial)
                        {
                            color = state == CropState.Lost ? new Color(0.45f, 0.32f, 0.16f) : CropColor(crop)
                        };
                        cropVisuals.Add(plant);
                    }
                }
            }
        }

        private void UpdateGrowthScale()
        {
            if (state != CropState.Growing || cropVisuals.Count == 0)
                return;

            FarmSession session = FarmSession.Instance;
            double duration = session.Balance.Crop(crop).GetDuration(session.Mode);
            float progress = duration <= 0d ? 1f : Mathf.Clamp01(1f - (float)(RemainingSeconds / duration));
            float scale = Mathf.Lerp(0.3f, 1f, progress);
            foreach (GameObject visual in cropVisuals)
            {
                if (visual == null) continue;
                Vector3 baseScale = new(0.16f, 0.38f, 0.16f);
                visual.transform.localScale = Vector3.Scale(baseScale, new Vector3(1f, scale, 1f));
            }
        }

        private static Color CropColor(CropKind value)
        {
            return value switch
            {
                CropKind.Corn => new Color(0.34f, 0.72f, 0.18f),
                CropKind.Cassava => new Color(0.22f, 0.56f, 0.20f),
                CropKind.Pineapple => new Color(0.38f, 0.66f, 0.16f),
                _ => Color.green
            };
        }

        private void RestoreFromSave()
        {
            FarmSession session = FarmSession.Instance;
            CropPlotSave saved = session?.Save.cropPlots.Find(item => item.id == persistentId);
            if (saved == null)
                return;
            transform.position = saved.position;
            state = saved.state;
            crop = saved.crop;
            readyAtUnix = saved.readyAtUnix;
            watered = saved.watered;
            protectedCrop = saved.protectedCrop;
        }

        private void SaveState()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;

            CropPlotSave saved = session.Save.cropPlots.Find(item => item.id == persistentId);
            if (saved == null)
            {
                saved = new CropPlotSave { id = persistentId };
                session.Save.cropPlots.Add(saved);
            }

            saved.position = transform.position;
            saved.state = state;
            saved.crop = crop;
            saved.readyAtUnix = readyAtUnix;
            saved.watered = watered;
            saved.protectedCrop = protectedCrop;
            session.NotifyChanged();
        }

        private void EnsureVisualReferencesIfNeeded()
        {
            if (timerLabel == null)
                EnsureVisualReferences();
        }
    }
}
