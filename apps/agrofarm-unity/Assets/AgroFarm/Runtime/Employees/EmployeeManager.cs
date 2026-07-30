using System;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class EmployeeManager : MonoBehaviour
    {
        public static EmployeeManager Instance { get; private set; }

        [SerializeField, Min(10f)] private float payrollIntervalSeconds = 300f;
        [SerializeField, Min(1f)] private float workerTickSeconds = 5f;
        private float payrollTimer;
        private float workerTimer;

        private void Awake()
        {
            Instance = this;
        }

        private void Update()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;

            workerTimer += Time.deltaTime;
            payrollTimer += Time.deltaTime;

            if (workerTimer >= workerTickSeconds)
            {
                workerTimer = 0f;
                RunWorkerTasks();
            }

            if (payrollTimer >= payrollIntervalSeconds)
            {
                payrollTimer = 0f;
                ProcessPayroll();
            }
        }

        public bool IsHired(EmployeeKind kind)
        {
            FarmSession session = FarmSession.Instance;
            return session != null && session.Save.hiredEmployees.Contains(kind.ToString());
        }

        public bool Hire(EmployeeKind kind)
        {
            FarmSession session = FarmSession.Instance;
            if (session == null || IsHired(kind))
                return false;

            EmployeeBalance data = session.Balance.Employee(kind);
            if (!session.TrySpend(data.hireCost))
            {
                FarmHUD.Instance?.ShowMessage($"Contratar {data.displayName} custa {data.hireCost:0} moedas.");
                return false;
            }

            session.Save.hiredEmployees.Add(kind.ToString());
            session.NotifyChanged();
            FarmHUD.Instance?.ShowMessage($"{data.displayName} contratado.");
            return true;
        }

        public void Dismiss(EmployeeKind kind)
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;
            session.Save.hiredEmployees.Remove(kind.ToString());
            session.NotifyChanged();
        }

        private void RunWorkerTasks()
        {
            if (IsHired(EmployeeKind.Harvester))
            {
                CropPlot[] plots = FindObjectsByType<CropPlot>(FindObjectsSortMode.None);
                foreach (CropPlot plot in plots)
                {
                    if (plot != null && plot.State == CropState.Ready && plot.TryAutoHarvest())
                        break;
                }
            }

            if (IsHired(EmployeeKind.Seller))
                SellStoredProducts();
        }

        private void SellStoredProducts()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;

            float revenue = 0f;
            foreach (CropKind crop in Enum.GetValues(typeof(CropKind)))
            {
                string key = crop.ToString().ToLowerInvariant();
                int amount = session.GetInventory(key);
                if (amount <= 0)
                    continue;
                session.RemoveInventory(key, amount);
                revenue += session.CalculateCropSale(crop, amount);
            }

            revenue += SellProduct(session, "milk", AnimalKind.Cow);
            revenue += SellProduct(session, "eggs", AnimalKind.Chicken);
            revenue += SellProduct(session, "pig", AnimalKind.Pig);
            revenue += SellProduct(session, "fish", AnimalKind.Fish);

            if (revenue > 0f)
                session.AddCoins(revenue);
        }

        private static float SellProduct(FarmSession session, string key, AnimalKind kind)
        {
            int amount = session.GetInventory(key);
            if (amount <= 0)
                return 0f;
            session.RemoveInventory(key, amount);
            AnimalBalance data = session.Balance.Animal(kind);
            float unit = session.Mode == GameMode.Free ? data.freeProductValue : data.realisticProductValue;
            return unit * amount;
        }

        private void ProcessPayroll()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;

            foreach (EmployeeKind kind in Enum.GetValues(typeof(EmployeeKind)))
            {
                if (!IsHired(kind))
                    continue;
                EmployeeBalance data = session.Balance.Employee(kind);
                if (!session.TrySpend(data.wagePerDay))
                {
                    Dismiss(kind);
                    FarmHUD.Instance?.ShowMessage($"{data.displayName} foi desligado por falta de saldo.");
                }
            }
        }
    }
}
