using System;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmBuildingInteraction : MonoBehaviour, IFarmInteractable
    {
        [SerializeField] private PlaceableKind kind;
        [SerializeField] private Vector3 approachOffset = new(0f, 0f, 3f);
        public Transform InteractionTransform => transform;

        public void Configure(PlaceableKind value) => kind = value;

        public Vector3 GetApproachPoint(Vector3 actorPosition) => transform.position + transform.TransformDirection(approachOffset);

        public void Interact(FarmSession session)
        {
            if (session == null)
                return;

            switch (kind)
            {
                case PlaceableKind.FarmHouse:
                    FarmHUD.Instance?.OpenHouse();
                    break;
                case PlaceableKind.Barn:
                    FarmHUD.Instance?.OpenBarn();
                    break;
                case PlaceableKind.Market:
                    SellEverything(session);
                    break;
                case PlaceableKind.Workshop:
                    FarmHUD.Instance?.ShowMessage("Oficina agrícola: manutenção e máquinas serão administradas aqui.");
                    break;
                default:
                    FarmHUD.Instance?.ShowMessage(kind.ToString());
                    break;
            }
        }

        private static void SellEverything(FarmSession session)
        {
            float revenue = 0f;
            foreach (CropKind crop in Enum.GetValues(typeof(CropKind)))
            {
                string key = crop.ToString().ToLowerInvariant();
                int amount = session.GetInventory(key);
                if (amount <= 0) continue;
                session.RemoveInventory(key, amount);
                revenue += session.CalculateCropSale(crop, amount);
            }

            revenue += SellAnimalProduct(session, "milk", AnimalKind.Cow);
            revenue += SellAnimalProduct(session, "eggs", AnimalKind.Chicken);
            revenue += SellAnimalProduct(session, "pig", AnimalKind.Pig);
            revenue += SellAnimalProduct(session, "fish", AnimalKind.Fish);

            if (revenue <= 0f)
            {
                FarmHUD.Instance?.ShowMessage("Não há produtos no galpão para vender.");
                return;
            }

            session.AddCoins(revenue);
            FarmHUD.Instance?.ShowMessage($"Venda concluída: +{revenue:0.00} moedas.");
        }

        private static float SellAnimalProduct(FarmSession session, string key, AnimalKind kind)
        {
            int amount = session.GetInventory(key);
            if (amount <= 0) return 0f;
            session.RemoveInventory(key, amount);
            AnimalBalance balance = session.Balance.Animal(kind);
            float unit = session.Mode == GameMode.Free ? balance.freeProductValue : balance.realisticProductValue;
            return unit * amount;
        }
    }
}
