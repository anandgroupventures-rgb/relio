"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { useAuth } from "@/lib/hooks/useAuth";
import { localLeads } from "@/lib/firebase/offlineDB";
import LeadCard from "./LeadCard";
import { SkeletonCard } from "@/components/shared/Skeleton";
import styles from "./VirtualizedLeadList.module.css";

// Height of each lead card (must match CSS)
const LEAD_CARD_HEIGHT = 140;
// Number of leads to load per page
const PAGE_SIZE = 20;
// Buffer size for infinite scroll
const BUFFER_SIZE = 5;

export default function VirtualizedLeadList({
  leads: initialLeads = [],
  onCall,
  onWhatsApp,
  onArchive,
  loading,
  hasMore,
  onLoadMore,
  searchQuery,
  filters,
  emptyState,
}) {
  const { user } = useAuth();
  const listRef = useRef(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    let result = [...initialLeads];

    // Apply search filter
    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.name?.toLowerCase().includes(query) ||
          lead.mobile?.includes(query) ||
          lead.projectInterest?.toLowerCase().includes(query) ||
          lead.remarks?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters?.status) {
      result = result.filter((lead) => lead.stage === filters.status || lead.status === filters.status);
    }

    // Apply source filter
    if (filters?.source) {
      result = result.filter((lead) => lead.source === filters.source);
    }

    // Apply category filter
    if (filters?.category) {
      result = result.filter((lead) => lead.category === filters.category);
    }

    // Apply temperature filter
    if (filters?.temperature) {
      result = result.filter((lead) => {
        const score = lead.score || 50;
        if (filters.temperature === "hot") return score >= 75;
        if (filters.temperature === "warm") return score >= 50 && score < 75;
        if (filters.temperature === "cold") return score >= 25 && score < 50;
        if (filters.temperature === "dormant") return score < 25;
        return true;
      });
    }

    return result;
  }, [initialLeads, searchQuery, filters]);

  // Determine if an item is loaded (for infinite loader)
  const isItemLoaded = useCallback(
    (index) => {
      return !hasMore || index < filteredLeads.length;
    },
    [filteredLeads.length, hasMore]
  );

  // Load more items
  const loadMoreItems = useCallback(
    async (startIndex, stopIndex) => {
      if (!hasMore || isLoadingMore || !user?.uid) return;

      setIsLoadingMore(true);
      try {
        await onLoadMore?.(startIndex, PAGE_SIZE);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMore, isLoadingMore, onLoadMore, user?.uid]
  );

  // Row renderer for react-window
  const Row = useCallback(
    ({ index, style }) => {
      const lead = filteredLeads[index];

      if (!lead) {
        // Loading state
        return (
          <div style={style} className={styles.row}>
            <SkeletonCard />
          </div>
        );
      }

      return (
        <div style={style} className={styles.row}>
          <LeadCard
            lead={lead}
            onCall={onCall}
            onWhatsApp={onWhatsApp}
            onArchive={onArchive}
          />
        </div>
      );
    },
    [filteredLeads, onCall, onWhatsApp, onArchive]
  );

  // Get list height based on viewport
  const getListHeight = useCallback(() => {
    if (typeof window === "undefined") return 600;
    // Calculate available height (viewport minus header, filters, nav)
    const availableHeight = window.innerHeight - 280;
    return Math.max(400, availableHeight);
  }, []);

  const [listHeight, setListHeight] = useState(getListHeight());

  // Update height on resize
  useEffect(() => {
    const handleResize = () => {
      setListHeight(getListHeight());
      // Reset scroll position on resize
      listRef.current?.resetAfterIndex(0);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getListHeight]);

  // Scroll to top when search/filters change
  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [searchQuery, filters]);

  if (loading && filteredLeads.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (filteredLeads.length === 0 && !loading) {
    return emptyState || (
      <div className={styles.emptyState}>
        <p>No leads found</p>
      </div>
    );
  }

  const itemCount = hasMore ? filteredLeads.length + 1 : filteredLeads.length;

  return (
    <div className={styles.container}>
      {/* Lead count indicator */}
      <div className={styles.countIndicator}>
        Showing {filteredLeads.length} leads
        {searchQuery && ` (filtered from ${initialLeads.length})`}
      </div>

      {/* Virtualized list */}
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}
        threshold={BUFFER_SIZE}
      >
        {({ onItemsRendered, ref }) => (
          <List
            className={styles.list}
            height={listHeight}
            itemCount={itemCount}
            itemSize={LEAD_CARD_HEIGHT}
            onItemsRendered={onItemsRendered}
            ref={(listInstance) => {
              // Store ref for scroll operations
              listRef.current = listInstance;
              // Pass to InfiniteLoader
              if (typeof ref === "function") {
                ref(listInstance);
              } else if (ref) {
                ref.current = listInstance;
              }
            }}
            width="100%"
            overscanCount={3}
          >
            {Row}
          </List>
        )}
      </InfiniteLoader>

      {/* Loading indicator at bottom */}
      {isLoadingMore && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner} />
          <span>Loading more leads...</span>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && filteredLeads.length > 0 && (
        <div className={styles.endOfList}>No more leads</div>
      )}
    </div>
  );
}
