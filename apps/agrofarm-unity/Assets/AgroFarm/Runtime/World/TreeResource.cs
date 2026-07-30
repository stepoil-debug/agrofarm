using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class TreeResource : MonoBehaviour, IFarmInteractable
    {
        [SerializeField] private string persistentId;
        [SerializeField] private int woodReward = 3;
        [SerializeField] private float removalCost = 10f;

        public Transform InteractionTransform => transform;
        public string PersistentId => persistentId;

        public void Configure(string id, int reward, float cost)
        {
            persistentId = id;
            woodReward = reward;
            removalCost = cost;
            ApplySavedState();
        }

        private void Awake()
        {
            if (string.IsNullOrWhiteSpace(persistentId))
                persistentId = $"tree-{transform.position.x:0.0}-{transform.position.z:0.0}";
            ApplySavedState();
        }

        private void ApplySavedState()
        {
            FarmSession session = FarmSession.Instance;
            if (session != null && session.Save.removedTreeIds.Contains(persistentId))
                gameObject.SetActive(false);
        }

        public Vector3 GetApproachPoint(Vector3 actorPosition)
        {
            Vector3 away = actorPosition - transform.position;
            away.y = 0f;
            if (away.sqrMagnitude < 0.01f)
                away = Vector3.forward;
            return transform.position + away.normalized * 1.5f;
        }

        public void Interact(FarmSession session)
        {
            FarmHUD.Instance?.ShowMessage("Árvores são fixas. Use Editar > Machado para remover.");
        }

        public bool TryCut()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return false;

            if (!session.Save.axeOwned)
            {
                if (!session.BuyAxe())
                {
                    FarmHUD.Instance?.ShowMessage($"Compre o machado por {session.Balance.axePurchaseCost:0} moedas.");
                    return false;
                }
                FarmHUD.Instance?.ShowMessage("Machado comprado. Selecione a árvore novamente para cortar.");
                return false;
            }

            float cost = removalCost > 0f ? removalCost : session.Balance.treeRemovalCost;
            if (!session.TrySpend(cost))
            {
                FarmHUD.Instance?.ShowMessage($"Cortar esta árvore custa {cost:0} moedas.");
                return false;
            }

            if (!session.Save.removedTreeIds.Contains(persistentId))
                session.Save.removedTreeIds.Add(persistentId);

            int reward = woodReward > 0 ? woodReward : session.Balance.woodPerTree;
            session.AddWood(reward);
            session.NotifyChanged();
            gameObject.SetActive(false);
            FarmHUD.Instance?.ShowMessage($"Árvore removida. +{reward} madeiras.");
            return true;
        }
    }
}
