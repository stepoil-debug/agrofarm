using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmExpansionManager : MonoBehaviour
    {
        [SerializeField] private Vector2 initialSize = new(44f, 30f);
        [SerializeField, Min(1f)] private float growthPerLevel = 8f;

        public Bounds CurrentBounds
        {
            get
            {
                int level = FarmSession.Instance?.Save.expansionLevel ?? 0;
                Vector3 size = new(initialSize.x + level * growthPerLevel * 2f, 4f, initialSize.y + level * growthPerLevel * 2f);
                return new Bounds(Vector3.zero, size);
            }
        }

        public bool Contains(Vector3 position, Vector2 footprint)
        {
            Bounds bounds = CurrentBounds;
            float halfX = footprint.x * 0.5f;
            float halfZ = footprint.y * 0.5f;
            return position.x - halfX >= bounds.min.x && position.x + halfX <= bounds.max.x &&
                   position.z - halfZ >= bounds.min.z && position.z + halfZ <= bounds.max.z;
        }

        public float NextCost
        {
            get
            {
                FarmSession session = FarmSession.Instance;
                int index = Mathf.Clamp(session?.Save.expansionLevel ?? 0, 0, session.Balance.expansionCosts.Length - 1);
                return session.Balance.expansionCosts[index];
            }
        }

        public bool TryExpand()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return false;

            int level = session.Save.expansionLevel;
            if (level >= session.Balance.expansionCosts.Length)
            {
                FarmHUD.Instance?.ShowMessage("Todas as expansões disponíveis já foram compradas.");
                return false;
            }

            float cost = session.Balance.expansionCosts[level];
            if (!session.TrySpend(cost))
            {
                FarmHUD.Instance?.ShowMessage($"A próxima expansão custa {cost:0} moedas.");
                return false;
            }

            session.Save.expansionLevel++;
            session.NotifyChanged();
            FarmWorldFactory.Instance?.RefreshGroundSize(CurrentBounds.size);
            FarmHUD.Instance?.ShowMessage("Nova faixa de terra liberada.");
            return true;
        }
    }
}
