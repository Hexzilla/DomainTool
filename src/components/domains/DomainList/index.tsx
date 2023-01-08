import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import InfiniteScroll from 'react-infinite-scroll-component';

const TableContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const Avatar = styled.div`
  text-align: center;
  border-radius: 100%;
  text-transform: uppercase;
  color: rgb(255, 255, 255);
  background-color: rgb(26, 188, 156);
  font: 13px / 40px Helvetica, Arial, sans-serif;
`;

const client = new ApolloClient({
  uri: 'https://api.tezos.domains/graphql',
  cache: new InMemoryCache(),
});

// https://api-schema.tezos.domains/intfilter.doc.html
const getDomains = async (startDate, endDate, after?: string) => {
  return client.query({
    query: gql`
      query DomainsList(
        $where: DomainsFilter!
        $order: DomainOrder
        $first: Int
        $after: String
      ) {
        domains(where: $where, order: $order, first: $first, after: $after) {
          edges {
            node {
              id
              name
              level
              owner
              operators {
                id
                address
              }
              parentOwner
              expires: expiresAtUtc
            }
          }
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `,
    variables: {
      after: after,
      first: 50,
      where: {
        validity: 'EXPIRED',
        level: {
          equalTo: 2,
        },
        expiresAtUtc: {
          greaterThan: startDate,
          lessThan: endDate,
        },
      },
      order: {
        field: 'EXPIRES_AT',
        direction: 'DESC',
      },
    },
  });
};

type Domain = {
  name: string;
  expires: string;
};

type Page = {
  startCursor: string;
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DomainList = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [pageInfo, setPageInfo] = useState<Page | null>(null);

  const fetchData = useCallback((after?: string) => {
    console.log('loading....', after);
    const today = moment().format('YYYY-MM-DD');
    const startDate = moment(today).subtract(7, 'days');
    const endDate = moment(today).subtract(5, 'days');
    return getDomains(startDate, endDate, after)
      .then((result) => {
        if (result && result.data) {
          const domains = result.data.domains.edges.map((i) => {
            const node = i.node;
            return {
              name: node.name,
              expires: node.expires,
            };
          });
          setPageInfo(result.data.domains.pageInfo);
          return domains;
        }
      })
      .catch((e) => {
        console.error(e);
        return [];
      });
  }, []);

  const refresh = useCallback(async () => {
    const domains = await fetchData(undefined);
    setDomains(domains);
  }, [fetchData]);

  const fetchNext = useCallback(async () => {
    if (pageInfo && pageInfo.hasNextPage) {
      const items = await fetchData(pageInfo.endCursor);
      setDomains([...domains, ...items]);
    }
  }, [fetchData, pageInfo, domains, setDomains]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const expiredAt = (expires: string) => {
    const years = moment().diff(moment(expires), 'years');
    if (years >= 1) {
      return `expired ${years} months ago`;
    }

    const months = moment().diff(moment(expires), 'months');
    if (months >= 1) {
      return `expired ${months} months ago`;
    }

    const days = moment().diff(moment(expires), 'days');
    if (days >= 1) {
      return `expired ${days} days ago`;
    }

    const hours = moment().diff(moment(expires), 'hours');
    if (hours >= 1) {
      return `expired ${hours} hours ago`;
    }

    const minutes = moment().diff(moment(expires), 'minutes');
    if (minutes >= 1) {
      return `expired ${minutes} minutes ago`;
    }

    const seconds = moment().diff(moment(expires), 'seconds');
    if (seconds >= 1) {
      return `expired ${seconds} seconds ago`;
    }

    return 'expired just now';
  };

  return (
    <TableContainer>
      <div className="flex flex-col w-4/6 justify-center">
        <InfiniteScroll
          dataLength={domains.length}
          next={fetchNext}
          hasMore={!!pageInfo && pageInfo.hasNextPage}
          loader={<h4>Loading...</h4>}
          endMessage={
            <p style={{ textAlign: 'center' }}>
              <b>Yay! You have seen it all</b>
            </p>
          }
          // below props only if you need pull down functionality
          refreshFunction={refresh}
          pullDownToRefresh
          pullDownToRefreshThreshold={50}
          pullDownToRefreshContent={
            <h3 style={{ textAlign: 'center' }}>
              &#8595; Pull down to refresh
            </h3>
          }
          releaseToRefreshContent={
            <h3 style={{ textAlign: 'center' }}>&#8593; Release to refresh</h3>
          }
        >
          {domains.map((domain, index) => (
            <div
              key={index}
              className="flex flex-row justify-between items-center w-full p-4"
            >
              <div className="flex items-center">
                <div style={{ width: '40px', height: '40px' }}>
                  <Avatar> {domain.name.substring(0, 2)} </Avatar>
                </div>
                <a
                  className="p-2 cursor-pointer"
                  href={`https://app.tezos.domains/domain/${domain.name}`}
                >
                  {domain.name}
                </a>
              </div>
              <div className="flex items-center">
                <div>{expiredAt(domain.expires)}</div>
                <div className="ml-4">
                  {moment(domain.expires).format('MM/DD/YYYY hh:mm:ss')}
                </div>
              </div>
            </div>
          ))}
        </InfiniteScroll>
      </div>
    </TableContainer>
  );
};

export default DomainList;
