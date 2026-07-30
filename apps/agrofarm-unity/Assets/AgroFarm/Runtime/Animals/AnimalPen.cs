using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class AnimalPen : MonoBehaviour, IFarmInteractable
    {
        [SerializeField] private string persistentId;
        [SerializeField] private AnimalKind animalKind;
        [SerializeField] private int animalCount;
        [SerializeField, Range(0f, 100f)] private float care = 100f;
        [SerializeField] private double readyAtUnix;
        [SerializeField] private Transform animalRoot;

        private readonly List<GameObject> animalVisuals = new();
        private float nextTick;

        public string PersistentId => persistentId;
        public AnimalKind Kind => animalKind;
        public int AnimalCount => animalCount;
        public float Care => care;
        public double RemainingSeconds => Math.Max(0d, readyAtUnix - DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        public Transform InteractionTransform => transform;

        public void Configure(string id, AnimalKind kind)
        {
            persistentId = id;
            animalKind = kind;
            animalRoot ??= transform;
            Restore();
            RefreshVisuals();
        }

        private void Update()
        {
            if (Time.time < nextTick)
                return;
            nextTick = Time.time + 1f;

            if (animalCount <= 0)
                return;

            bool caretaker = EmployeeManager.Instance != null && EmployeeManager.Instance.IsHired(EmployeeKind.Caretaker);
            care = Mathf.Clamp(care - (caretaker ? 0.01f : 0.08f), 0f, 100f);
            SaveState(false);
        }

        public Vector3 GetApproachPoint(Vector3 actorPosition)
        {
            Vector3 direction = actorPosition - transform.position;
            direction.y = 0f;
            if (direction.sqrMagnitude < 0.01f)
                direction = Vector3.forward;
            return transform.position + direction.normalized * 3f;
        }

        public void Interact(FarmSession session)
        {
            FarmHUD.Instance?.OpenAnimalPen(this);
        }

        public bool TryBuyAnimal()
        {
            FarmSession session = FarmSession.Instance;
            AnimalBalance data = session.Balance.Animal(animalKind);
            if (animalCount >= data.initialCapacity)
            {
                FarmHUD.Instance?.ShowMessage("Capacidade máxima deste espaço atingida.");
                return false;
            }
            if (!session.TrySpend(data.purchaseCost))
            {
                FarmHUD.Instance?.ShowMessage($"{data.displayName} custa {data.purchaseCost:0} moedas.");
                return false;
            }

            animalCount++;
            care = Mathf.Max(care, 75f);
            if (readyAtUnix <= DateTimeOffset.UtcNow.ToUnixTimeSeconds())
                ScheduleNextCycle();
            RefreshVisuals();
            SaveState();
            return true;
        }

        public bool TryFeed()
        {
            if (animalCount <= 0)
            {
                FarmHUD.Instance?.ShowMessage("Este espaço ainda não possui animais.");
                return false;
            }

            FarmSession session = FarmSession.Instance;
            AnimalBalance data = session.Balance.Animal(animalKind);
            float cost = data.feedCost * animalCount;
            if (!session.TrySpend(cost))
            {
                FarmHUD.Instance?.ShowMessage($"A alimentação custa {cost:0} moedas.");
                return false;
            }

            care = Mathf.Min(100f, care + 35f);
            SaveState();
            return true;
        }

        public bool TryCollect()
        {
            if (animalCount <= 0)
                return false;
            if (RemainingSeconds > 0d)
            {
                FarmHUD.Instance?.ShowMessage($"Produção pronta em {FormatDuration(RemainingSeconds)}.");
                return false;
            }
            if (care < 25f)
            {
                FarmHUD.Instance?.ShowMessage("O cuidado está muito baixo. Alimente e limpe o espaço.");
                return false;
            }

            FarmSession session = FarmSession.Instance;
            string key = animalKind switch
            {
                AnimalKind.Cow => "milk",
                AnimalKind.Chicken => "eggs",
                AnimalKind.Pig => "pig",
                AnimalKind.Fish => "fish",
                _ => "product"
            };
            int yield = session.Mode == GameMode.Free ? Mathf.Max(1, animalCount) : Mathf.Max(1, animalCount / 2);
            if (!session.TryAddInventory(key, yield))
            {
                FarmHUD.Instance?.ShowMessage("Galpão sem espaço para receber a produção.");
                return false;
            }

            care = Mathf.Max(0f, care - 8f);
            ScheduleNextCycle();
            SaveState();
            FarmHUD.Instance?.ShowMessage($"Produção coletada: +{yield}.");
            return true;
        }

        private void ScheduleNextCycle()
        {
            FarmSession session = FarmSession.Instance;
            AnimalBalance data = session.Balance.Animal(animalKind);
            float duration = session.Mode == GameMode.Free ? data.freeCycleSeconds : data.realisticCycleSeconds;
            readyAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + duration;
        }

        private void RefreshVisuals()
        {
            foreach (GameObject visual in animalVisuals)
                if (visual != null) Destroy(visual);
            animalVisuals.Clear();

            for (int index = 0; index < animalCount; index++)
            {
                int row = index / 3;
                int column = index % 3;
                Vector3 offset = new((column - 1) * 1.4f, 0.45f, (row - 0.5f) * 1.5f);
                GameObject visual = CreateAnimalVisual(offset, index);
                animalVisuals.Add(visual);
            }
        }

        private GameObject CreateAnimalVisual(Vector3 localPosition, int index)
        {
            PrimitiveType primitive = animalKind == AnimalKind.Chicken ? PrimitiveType.Sphere : PrimitiveType.Capsule;
            GameObject animal = GameObject.CreatePrimitive(primitive);
            animal.name = $"{animalKind}_{index}";
            animal.transform.SetParent(animalRoot, false);
            animal.transform.localPosition = localPosition;
            animal.transform.localScale = animalKind switch
            {
                AnimalKind.Cow => new Vector3(0.65f, 0.8f, 1.1f),
                AnimalKind.Pig => new Vector3(0.65f, 0.55f, 0.9f),
                AnimalKind.Chicken => new Vector3(0.35f, 0.45f, 0.35f),
                AnimalKind.Fish => new Vector3(0.35f, 0.18f, 0.7f),
                _ => Vector3.one * 0.5f
            };
            Collider collider = animal.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            Renderer renderer = animal.GetComponent<Renderer>();
            renderer.material = new Material(renderer.sharedMaterial)
            {
                color = animalKind switch
                {
                    AnimalKind.Cow => index % 2 == 0 ? Color.white : new Color(0.15f, 0.12f, 0.1f),
                    AnimalKind.Chicken => new Color(0.95f, 0.75f, 0.34f),
                    AnimalKind.Pig => new Color(0.95f, 0.58f, 0.62f),
                    AnimalKind.Fish => new Color(0.27f, 0.62f, 0.78f),
                    _ => Color.white
                }
            };
            return animal;
        }

        private void Restore()
        {
            FarmSession session = FarmSession.Instance;
            AnimalPenSave saved = session?.Save.animalPens.Find(item => item.id == persistentId);
            if (saved == null)
                return;
            transform.position = saved.position;
            animalCount = saved.animalCount;
            care = saved.care;
            readyAtUnix = saved.readyAtUnix;
        }

        private void SaveState(bool notify = true)
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;
            AnimalPenSave saved = session.Save.animalPens.Find(item => item.id == persistentId);
            if (saved == null)
            {
                saved = new AnimalPenSave { id = persistentId, kind = animalKind };
                session.Save.animalPens.Add(saved);
            }
            saved.position = transform.position;
            saved.animalCount = animalCount;
            saved.care = care;
            saved.readyAtUnix = readyAtUnix;
            if (notify) session.NotifyChanged();
        }

        private static string FormatDuration(double seconds)
        {
            int total = Mathf.CeilToInt((float)Math.Max(0d, seconds));
            if (total < 60) return $"{total}s";
            if (total < 3600) return $"{total / 60}:{total % 60:00}";
            return $"{total / 3600}h {(total / 60) % 60:00}m";
        }
    }
}
