"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import LeadCard from "./LeadCard";
import { SkeletonCard } from "@/components/shared/Skeleton";
import styles from "./LeadList.module.css";

// Simple virtualized list without external dependencies
const LEAD_CARD_HEIGHT = 160; // Height of each lead card
const OVERSCAN = 5; // Number of items to render outside viewport

export default function LeadList({
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
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

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

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIdx = Math.floor(scrollTop / LEAD_CARD_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / LEAD_CARD_HEIGHT);
    const start = Math.max(0, startIdx - OVERSCAN);
    const end = Math.min(filteredLeads.length, startIdx + visibleCount + OVERSCAN);
    return { start, end };
  }, [scrollTop, containerHeight, filteredLeads.length]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const target = e.target;
    setScrollTop(target.scrollTop);
    
    // Check if near bottom to load more
    if (hasMore && onLoadMore) {
      const scrollBottom = target.scrollTop + target.clientHeight;
      const scrollHeight = target.scrollHeight;
      if (scrollBottom > scrollHeight - 200) {
        onLoadMore();
      }
    }
  }, [hasMore, onLoadMore]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Get visible leads
  const visibleLeads = useMemo(() => {
    return filteredLeads.slice(visibleRange.start, visibleRange.end);
  }, [filteredLeads, visibleRange]);

  // Calculate total height
  const totalHeight = filteredLeads.length * LEAD_CARD_HEIGHT;

  // Calculate offset for visible items
  const offsetY = visibleRange.start * LEAD_CARD_HEIGHT;

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

  return (
    <div className={styles.container}>
      {/* Lead count indicator */}
      <div className={styles.countIndicator}>
        Showing {filteredLeads.length} leads
        {searchQuery && ` (filtered from ${initialLeads.length})`}
        {hasMore && <span className={styles.moreBadge}>Scroll for more</span>}
      </div>

      {/* Virtualized list container */}
      <div 
        ref={containerRef}
        className={styles.listContainer}
        onScroll={handleScroll}
        style={{ height: '60vh', overflowY: 'auto' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            top: offsetY, 
            left: 0, 
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '0 16px'
          }}>
            {visibleLeads.map((lead) => (
              <div key={lead.id} style={{ height: LEAD_CARD_HEIGHT }}>
                <LeadCard
                  lead={lead}
                  onCall={onCall}
                  onWhatsApp={onWhatsApp}
                  onArchive={onArchive}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Loading indicator at bottom */}
        {loading && (
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
    </div>
  );
}
